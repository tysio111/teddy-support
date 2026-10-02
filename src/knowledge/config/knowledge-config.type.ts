export type AnswerEffort = 'low' | 'medium' | 'high';

export type KnowledgeConfig = {
  // Routes unmatched client messages (no intent / no actions) to the
  // knowledge base instead of ending the run.
  enabled: boolean;
  anthropicApiKey?: string;
  voyageApiKey?: string;

  // Qdrant (one collection per deployment)
  qdrantUrl: string;
  qdrantApiKey?: string;
  collection: string;

  // Embeddings. Changing the model or dimension requires a full re-index.
  embeddingModel: string;
  embeddingDimension: number;
  // Snowball stemmer for the sparse (keyword) vectors, e.g. 'english',
  // 'german'. Unset: no stemming, which works for any language.
  language?: string;

  // Models: a fast one for query rewriting, HyDE, reranking and chunk
  // context; a stronger one for the final answer.
  fastModel: string;
  answerModel: string;
  answerEffort: AnswerEffort;
  answerMaxTokens: number;

  // Chunking
  chunkTokens: number;
  chunkOverlapTokens: number;
  contextualChunks: boolean;

  // Retrieval
  prefetchLimit: number;
  rerankCandidates: number;
  topK: number;
  // Minimum reranker relevance (0-3) for a chunk to reach the answer.
  minRelevance: number;
  hydeEnabled: boolean;
  rerankEnabled: boolean;
  historyLimit: number;
};
