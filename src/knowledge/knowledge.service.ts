import { KnowledgeConfig } from './config/knowledge-config.type';
import { KnowledgeLlmService } from './llm/knowledge-llm.service';
import {
  Citation,
  ConversationTurn,
  KnowledgeAnswer,
  RetrievalOptions,
  RetrievedChunk,
} from './knowledge.types';
import { KnowledgeRetriever } from './retrieval/knowledge-retriever';

// Answers a client message from the knowledge base. Used by the intent graph
// for messages that match no action, and by the eval endpoint.
export class KnowledgeService {
  constructor(
    private readonly config: KnowledgeConfig,
    private readonly retriever: KnowledgeRetriever,
    private readonly llm: KnowledgeLlmService,
  ) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  async answer(input: {
    message: string;
    // Earlier turns, without the message itself.
    history: ConversationTurn[];
    options?: RetrievalOptions;
  }): Promise<KnowledgeAnswer> {
    const retrieval = await this.retriever.retrieve(input);

    // Runs even without chunks: small talk needs no sources, and the model
    // decides between that and "not found".
    const generated = await this.llm.answer({
      history: input.history.slice(-this.config.historyLimit),
      question: input.message,
      chunks: retrieval.chunks,
    });

    return {
      status: generated.status,
      reply: generated.reply,
      citations: toCitations(
        generated.usedChunks.map((index) => retrieval.chunks[index]),
      ),
      retrieval,
    };
  }
}

function toCitations(chunks: RetrievedChunk[]): Citation[] {
  const byKey = new Map<string, Citation>();
  for (const { resourceId, resourceTitle, headingPath } of chunks) {
    byKey.set(`${resourceId}:${headingPath.join('/')}`, {
      resourceId,
      resourceTitle,
      headingPath,
    });
  }
  return [...byKey.values()];
}
