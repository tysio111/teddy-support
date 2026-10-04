import { PiiRedactor } from '../../privacy/pii/pii-redactor';
import { KnowledgeConfig } from '../config/knowledge-config.type';
import { KnowledgeLlmService } from '../llm/knowledge-llm.service';
import {
  ConversationTurn,
  RetrievalOptions,
  RetrievalResult,
  RetrievedChunk,
} from '../knowledge.types';
import { DenseEmbedder } from './dense-embedder';
import { SparseEncoder } from './sparse-encoder';
import { KnowledgeVectorStore } from './vector-store';

/**
 * Query transformation → hybrid search (dense + sparse, RRF) → rerank.
 *
 * - Rewriting turns follow-ups ("and for Germany?") into standalone queries;
 *   skipped for a first message unless the knowledge base has a fixed
 *   language to translate into.
 * - HyDE (off by default) embeds a hypothetical answer next to the query.
 *   The sparse search always uses the rewritten query: invented specifics
 *   would only add keyword noise.
 * - Reranking rates the fused candidates 0-3 with the fast model and keeps
 *   those at or above `minRelevance`. Without it, the top fused results are
 *   used as they are.
 * - The query reaches the embedding provider with PII masked.
 */
export class KnowledgeRetriever {
  constructor(
    private readonly config: KnowledgeConfig,
    private readonly llm: KnowledgeLlmService,
    private readonly embedder: DenseEmbedder,
    private readonly sparseEncoder: SparseEncoder,
    private readonly store: KnowledgeVectorStore,
    private readonly redactor = new PiiRedactor(),
  ) {}

  async retrieve({
    message,
    history,
    options = {},
  }: {
    message: string;
    // Earlier turns, without the message itself.
    history: ConversationTurn[];
    options?: RetrievalOptions;
  }): Promise<RetrievalResult> {
    const { config } = this;
    const hybrid = options.hybrid ?? true;
    const hyde = options.hyde ?? config.hydeEnabled;
    const rerank = options.rerank ?? config.rerankEnabled;

    const recent = history.slice(-config.historyLimit);
    const rewrittenQuery =
      recent.length || config.language
        ? await this.llm.rewriteQuery({
            history: recent,
            message,
            language: config.language,
          })
        : this.redactor.redact(message);
    const hypotheticalAnswer = hyde
      ? await this.llm.hypotheticalAnswer(rewrittenQuery)
      : null;

    const candidates = await this.store.search({
      dense: await this.embedder.embedQuery(
        hypotheticalAnswer
          ? `${rewrittenQuery}\n\n${hypotheticalAnswer}`
          : rewrittenQuery,
      ),
      sparse: this.sparseEncoder.encode(rewrittenQuery),
      prefetchLimit: config.prefetchLimit,
      limit: rerank ? config.rerankCandidates : config.topK,
      hybrid,
    });

    return {
      rewrittenQuery,
      hypotheticalAnswer,
      candidates: candidates.length,
      chunks:
        rerank && candidates.length
          ? selectRelevant(
              candidates,
              await this.llm.rerank(rewrittenQuery, candidates),
              config,
            )
          : candidates.slice(0, config.topK),
    };
  }
}

// Highest relevance first; ties keep the fused (RRF) order.
export function selectRelevant(
  candidates: RetrievedChunk[],
  relevance: number[],
  { minRelevance, topK }: Pick<KnowledgeConfig, 'minRelevance' | 'topK'>,
): RetrievedChunk[] {
  return candidates
    .map((chunk, index) => ({ ...chunk, relevance: relevance[index] ?? 0 }))
    .filter((chunk) => chunk.relevance >= minRelevance)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, topK);
}
