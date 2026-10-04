import { Logger } from '@nestjs/common';
import { OutputReview, OutputReviewVerdictEnum } from '../utils/output-review';
import { KnowledgeConfig } from './config/knowledge-config.type';
import { KnowledgeLlmService } from './llm/knowledge-llm.service';
import {
  Citation,
  ConversationTurn,
  KnowledgeAnswer,
  KnowledgeAnswerStatusEnum,
  RetrievalOptions,
  RetrievedChunk,
} from './knowledge.types';
import { KnowledgeRetriever } from './retrieval/knowledge-retriever';

// Answers a client message from the knowledge base. Used by the intent graph
// for messages that match no action, and by the eval endpoint.
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

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

    const citedChunks = generated.usedChunks.map(
      (index) => retrieval.chunks[index],
    );
    const review = await this.review(
      input.message,
      generated.reply,
      citedChunks,
    );
    const rejected =
      review !== null && review.verdict !== OutputReviewVerdictEnum.pass;
    if (rejected) {
      this.logger.warn(
        `Answer rejected by output review (${review.verdict}): ${review.reason}`,
      );
    }

    return {
      status: rejected ? KnowledgeAnswerStatusEnum.rejected : generated.status,
      reply: rejected ? null : generated.reply,
      citations: toCitations(citedChunks),
      retrieval,
      review,
    };
  }

  private async review(
    question: string,
    reply: string | null,
    citedChunks: RetrievedChunk[],
  ): Promise<OutputReview | null> {
    if (!this.config.outputGuardrailEnabled || !reply) {
      return null;
    }

    return this.llm.reviewAnswer({ question, reply, citedChunks });
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
