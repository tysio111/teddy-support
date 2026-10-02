import { ApiProperty } from '@nestjs/swagger';
import { KnowledgeAnswerStatusEnum } from '../knowledge.types';

export class CitationDto {
  @ApiProperty()
  resourceId: string;

  @ApiProperty()
  resourceTitle: string;

  @ApiProperty({ type: [String] })
  headingPath: string[];
}

export class RetrievedChunkDto extends CitationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  chunkIndex: number;

  @ApiProperty()
  text: string;

  @ApiProperty({ type: String, nullable: true })
  context: string | null;

  @ApiProperty({ description: 'Fused (RRF) hybrid search score' })
  score: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Reranker relevance 0-3',
  })
  relevance: number | null;
}

// Flat shape for evals: `contexts` is what DeepEval calls retrieval_context.
export class KnowledgeAnswerDto {
  @ApiProperty({ enum: KnowledgeAnswerStatusEnum })
  status: KnowledgeAnswerStatusEnum;

  @ApiProperty({ type: String, nullable: true })
  reply: string | null;

  @ApiProperty({ type: () => [CitationDto] })
  citations: CitationDto[];

  @ApiProperty()
  rewrittenQuery: string;

  @ApiProperty({ type: String, nullable: true })
  hypotheticalAnswer: string | null;

  @ApiProperty({ description: 'Hybrid search results before reranking' })
  candidates: number;

  @ApiProperty({ type: [String] })
  contexts: string[];

  @ApiProperty({ type: () => [RetrievedChunkDto] })
  chunks: RetrievedChunkDto[];

  @ApiProperty()
  latencyMs: number;
}
