import { Message } from '../messages/domain/message';
import { Resource } from '../resources/domain/resource';
import { OutputReview } from '../utils/output-review';

// What retrieval needs from a conversation. Message satisfies it, so does a
// plain transcript sent to the eval endpoint.
export type ConversationTurn = Pick<Message, 'sender' | 'content'>;

// Stored as the Qdrant point payload.
export type ChunkPayload = {
  resourceId: Resource['id'];
  resourceTitle: string;
  // Section headings the chunk sits under, outermost first.
  headingPath: string[];
  chunkIndex: number;
  text: string;
  // One or two sentences situating the chunk in its document; prepended to
  // the text before embedding (contextual retrieval).
  context: string | null;
};

export type RetrievedChunk = ChunkPayload & {
  id: string;
  // Fused (RRF) score from the hybrid search.
  score: number;
  // Reranker relevance 0-3, null when reranking is off.
  relevance: number | null;
};

// Per-request overrides of the configured pipeline, for evals and ablations.
export type RetrievalOptions = {
  hybrid?: boolean;
  hyde?: boolean;
  rerank?: boolean;
};

export type RetrievalResult = {
  rewrittenQuery: string;
  hypotheticalAnswer: string | null;
  // Number of chunks the hybrid search returned, before reranking.
  candidates: number;
  chunks: RetrievedChunk[];
};

export type Citation = Pick<
  ChunkPayload,
  'resourceId' | 'resourceTitle' | 'headingPath'
>;

export enum KnowledgeAnswerStatusEnum {
  answered = 'answered',
  // Greetings, thanks and the like: replied to without sources.
  smallTalk = 'small_talk',
  // The knowledge base does not cover the question: hand over to a human
  // instead of replying.
  notFound = 'not_found',
  // A reply was drafted but failed the output review (ungrounded or against
  // policy): hand over to a human instead of sending it.
  rejected = 'rejected',
}

export type KnowledgeAnswer = {
  status: KnowledgeAnswerStatusEnum;
  // Null when not found or rejected.
  reply: string | null;
  citations: Citation[];
  retrieval: RetrievalResult;
  // Null when the review is off or there was no reply to review.
  review: OutputReview | null;
};
