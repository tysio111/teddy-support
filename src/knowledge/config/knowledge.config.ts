import { registerAs } from '@nestjs/config';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { AnswerEffort, KnowledgeConfig } from './knowledge-config.type';

class EnvironmentVariablesValidator {
  @IsBoolean()
  @IsOptional()
  KNOWLEDGE_ENABLED: boolean;

  // Read the raw env value: implicit conversion turns any non-empty string
  // (including 'false') into `true`.
  @ValidateIf(() => process.env.KNOWLEDGE_ENABLED === 'true')
  @IsString()
  VOYAGE_API_KEY: string;

  @IsString()
  @IsOptional()
  QDRANT_URL: string;

  @IsString()
  @IsOptional()
  QDRANT_API_KEY: string;

  @IsString()
  @IsOptional()
  KNOWLEDGE_COLLECTION: string;

  @IsString()
  @IsOptional()
  KNOWLEDGE_EMBEDDING_MODEL: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  KNOWLEDGE_EMBEDDING_DIMENSION: number;

  @IsString()
  @IsOptional()
  KNOWLEDGE_LANGUAGE: string;

  @IsString()
  @IsOptional()
  KNOWLEDGE_FAST_MODEL: string;

  @IsString()
  @IsOptional()
  KNOWLEDGE_ANSWER_MODEL: string;

  @IsIn(['low', 'medium', 'high'])
  @IsOptional()
  KNOWLEDGE_ANSWER_EFFORT: string;

  @IsInt()
  @Min(256)
  @IsOptional()
  KNOWLEDGE_ANSWER_MAX_TOKENS: number;

  @IsInt()
  @Min(50)
  @IsOptional()
  KNOWLEDGE_CHUNK_TOKENS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  KNOWLEDGE_CHUNK_OVERLAP_TOKENS: number;

  @IsBoolean()
  @IsOptional()
  KNOWLEDGE_CONTEXTUAL_CHUNKS: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  KNOWLEDGE_PREFETCH_LIMIT: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  KNOWLEDGE_RERANK_CANDIDATES: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  KNOWLEDGE_TOP_K: number;

  @IsInt()
  @Min(0)
  @Max(3)
  @IsOptional()
  KNOWLEDGE_MIN_RELEVANCE: number;

  @IsBoolean()
  @IsOptional()
  KNOWLEDGE_HYDE_ENABLED: boolean;

  @IsBoolean()
  @IsOptional()
  KNOWLEDGE_RERANK_ENABLED: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  KNOWLEDGE_HISTORY_LIMIT: number;
}

function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  return value ? parseInt(value, 10) : fallback;
}

export default registerAs<KnowledgeConfig>('knowledge', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    enabled: process.env.KNOWLEDGE_ENABLED === 'true',
    // Shared with intent recognition and doc extraction.
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    voyageApiKey: process.env.VOYAGE_API_KEY,

    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    qdrantApiKey: process.env.QDRANT_API_KEY || undefined,
    collection: process.env.KNOWLEDGE_COLLECTION || 'knowledge',

    embeddingModel: process.env.KNOWLEDGE_EMBEDDING_MODEL || 'voyage-3.5',
    embeddingDimension: intEnv('KNOWLEDGE_EMBEDDING_DIMENSION', 1024),
    language: process.env.KNOWLEDGE_LANGUAGE || undefined,

    fastModel: process.env.KNOWLEDGE_FAST_MODEL || 'claude-haiku-4-5',
    answerModel: process.env.KNOWLEDGE_ANSWER_MODEL || 'claude-opus-5-5',
    answerEffort:
      (process.env.KNOWLEDGE_ANSWER_EFFORT as AnswerEffort) || 'medium',
    answerMaxTokens: intEnv('KNOWLEDGE_ANSWER_MAX_TOKENS', 4000),

    chunkTokens: intEnv('KNOWLEDGE_CHUNK_TOKENS', 500),
    chunkOverlapTokens: intEnv('KNOWLEDGE_CHUNK_OVERLAP_TOKENS', 75),
    contextualChunks: process.env.KNOWLEDGE_CONTEXTUAL_CHUNKS !== 'false',

    prefetchLimit: intEnv('KNOWLEDGE_PREFETCH_LIMIT', 40),
    rerankCandidates: intEnv('KNOWLEDGE_RERANK_CANDIDATES', 20),
    topK: intEnv('KNOWLEDGE_TOP_K', 6),
    minRelevance: intEnv('KNOWLEDGE_MIN_RELEVANCE', 2),
    hydeEnabled: process.env.KNOWLEDGE_HYDE_ENABLED === 'true',
    rerankEnabled: process.env.KNOWLEDGE_RERANK_ENABLED !== 'false',
    historyLimit: intEnv('KNOWLEDGE_HISTORY_LIMIT', 6),
  };
});
