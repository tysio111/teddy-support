import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { PiiRedactor } from '../../privacy/pii/pii-redactor';
import {
  buildOutputReviewPrompt,
  OUTPUT_REVIEW_SYSTEM_PROMPT,
  OutputReview,
  outputReviewSchema,
} from '../../utils/output-review';
import {
  ConversationTurn,
  KnowledgeAnswerStatusEnum,
  RetrievedChunk,
} from '../knowledge.types';
import {
  ANSWER_SYSTEM_PROMPT,
  buildAnswerPrompt,
  formatSources,
} from '../prompts/answer.prompt';
import {
  buildChunksPrompt,
  buildDocumentBlock,
  CONTEXTUALIZE_SYSTEM_PROMPT,
} from '../prompts/contextualize.prompt';
import {
  buildHydePrompt,
  buildRewritePrompt,
  HYDE_SYSTEM_PROMPT,
  REWRITE_SYSTEM_PROMPT,
} from '../prompts/query.prompt';
import {
  buildRerankPrompt,
  RERANK_SYSTEM_PROMPT,
} from '../prompts/rerank.prompt';
import { KnowledgeChatModels, withStructuredOutput } from './chat-models';

const rewriteSchema = z.object({
  query: z.string().describe('The standalone search query'),
});

const hydeSchema = z.object({
  passage: z.string().describe('The hypothetical help center passage'),
});

const rerankSchema = z.object({
  ratings: z.array(
    z.object({
      passage: z.number().int().describe('The passage id'),
      relevance: z.number().int().min(0).max(3),
    }),
  ),
});

const contextSchema = z.object({
  contexts: z.array(
    z.object({
      chunk: z.number().int().describe('The chunk number'),
      context: z.string(),
    }),
  ),
});

const answerSchema = z.object({
  kind: z.enum(['answered', 'small_talk', 'not_found']),
  reply: z.string().describe('The reply to the customer, empty if not_found'),
  sources: z.array(z.number().int()).describe('Ids of the sources used'),
});

export type GeneratedAnswer = {
  status: KnowledgeAnswerStatusEnum;
  reply: string | null;
  // Indexes into the chunks passed in (0-based).
  usedChunks: number[];
};

// Every call runs through the PII redactor. Search strings (rewritten query,
// HyDE passage) keep their placeholders because they are sent on to the
// embedding provider; answers and chunk contexts get the values back.
export class KnowledgeLlmService {
  constructor(
    private readonly models: KnowledgeChatModels | null,
    private readonly redactor = new PiiRedactor(),
  ) {}

  async rewriteQuery(input: {
    history: ConversationTurn[];
    message: string;
    language?: string;
  }): Promise<string> {
    const { fast } = this.getModels();
    const result = await this.redactor
      .wrap(withStructuredOutput(fast, rewriteSchema, 'search_query'), {
        restore: false,
      })
      .invoke([
        new SystemMessage(REWRITE_SYSTEM_PROMPT),
        new HumanMessage(buildRewritePrompt(input)),
      ]);

    return result.query.trim() || this.redactor.redact(input.message);
  }

  async hypotheticalAnswer(query: string): Promise<string> {
    const { fast } = this.getModels();
    const result = await this.redactor
      .wrap(withStructuredOutput(fast, hydeSchema, 'help_center_passage'), {
        restore: false,
      })
      .invoke([
        new SystemMessage(HYDE_SYSTEM_PROMPT),
        new HumanMessage(buildHydePrompt(query)),
      ]);

    return result.passage;
  }

  // Returns a 0-3 relevance per candidate, in input order. Candidates the
  // model skipped count as unrelated.
  async rerank(query: string, candidates: RetrievedChunk[]): Promise<number[]> {
    const { fast } = this.getModels();
    const result = await this.redactor
      .wrap(withStructuredOutput(fast, rerankSchema, 'rate_passages'))
      .invoke([
        new SystemMessage(RERANK_SYSTEM_PROMPT),
        new HumanMessage(buildRerankPrompt(query, candidates)),
      ]);

    const relevance = candidates.map(() => 0);
    for (const { passage, relevance: rating } of result.ratings) {
      if (passage >= 1 && passage <= candidates.length) {
        relevance[passage - 1] = rating;
      }
    }
    return relevance;
  }

  // The document is sent once per batch and prompt-cached, so contextualizing
  // a long document costs little more than reading it once.
  async contextualizeChunks(input: {
    title: string;
    document: string;
    chunks: { index: number; text: string }[];
  }): Promise<Map<number, string>> {
    const { fast } = this.getModels();
    const result = await this.redactor
      .wrap(withStructuredOutput(fast, contextSchema, 'chunk_contexts'))
      .invoke([
        new SystemMessage(CONTEXTUALIZE_SYSTEM_PROMPT),
        new HumanMessage({
          content: [
            {
              type: 'text',
              text: buildDocumentBlock(input.title, input.document),
              cache_control: { type: 'ephemeral' },
            },
            { type: 'text', text: buildChunksPrompt(input.chunks) },
          ],
        }),
      ]);

    return new Map(
      result.contexts.map(({ chunk, context }) => [chunk, context.trim()]),
    );
  }

  async answer(input: {
    history: ConversationTurn[];
    question: string;
    chunks: RetrievedChunk[];
  }): Promise<GeneratedAnswer> {
    const { answer } = this.getModels();
    const result = await this.redactor
      .wrap(withStructuredOutput(answer, answerSchema, 'answer'))
      .invoke([
        new SystemMessage(ANSWER_SYSTEM_PROMPT),
        new HumanMessage(buildAnswerPrompt(input)),
      ]);

    const reply = result.reply.trim();
    if (result.kind === 'not_found' || !reply) {
      return {
        status: KnowledgeAnswerStatusEnum.notFound,
        reply: null,
        usedChunks: [],
      };
    }

    return {
      status:
        result.kind === 'small_talk'
          ? KnowledgeAnswerStatusEnum.smallTalk
          : KnowledgeAnswerStatusEnum.answered,
      reply,
      usedChunks: [...new Set(result.sources)]
        .filter((id) => id >= 1 && id <= input.chunks.length)
        .map((id) => id - 1),
    };
  }

  // Output guardrail: checks the reply against the sources it cites and the
  // policy. The reason keeps its placeholders, since it is logged.
  async reviewAnswer(input: {
    question: string;
    reply: string;
    citedChunks: RetrievedChunk[];
  }): Promise<OutputReview> {
    const { fast } = this.getModels();
    return this.redactor
      .wrap(withStructuredOutput(fast, outputReviewSchema, 'review_reply'), {
        restore: false,
      })
      .invoke([
        new SystemMessage(OUTPUT_REVIEW_SYSTEM_PROMPT),
        new HumanMessage(
          buildOutputReviewPrompt({
            reference: formatSources(input.citedChunks),
            message: input.question,
            reply: input.reply,
          }),
        ),
      ]);
  }

  private getModels(): KnowledgeChatModels {
    if (!this.models) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    return this.models;
  }
}
