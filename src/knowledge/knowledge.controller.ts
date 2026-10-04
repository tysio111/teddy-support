import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Resource } from '../resources/domain/resource';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { KnowledgeAnswerDto } from './dto/knowledge-answer.dto';
import { QueryKnowledgeDto } from './dto/query-knowledge.dto';
import { KnowledgeIndexerService } from './ingestion/knowledge-indexer.service';
import { KnowledgeService } from './knowledge.service';

@ApiTags('Knowledge')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  version: '1',
})
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly knowledgeIndexerService: KnowledgeIndexerService,
  ) {}

  // Chunks, embeds and stores the resource's document in the knowledge base.
  // Runs in the background: poll the resource until its indexStatus is
  // indexed or failed. Re-indexing replaces the previous chunks.
  @Post('resources/:id/index')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiAcceptedResponse({ type: Resource })
  index(@Param('id') id: string) {
    return this.knowledgeIndexerService.requestIndexing(id);
  }

  @Delete('resources/:id/index')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiNoContentResponse()
  removeFromIndex(@Param('id') id: string): Promise<void> {
    return this.knowledgeIndexerService.removeFromIndex(id);
  }

  // Runs the full pipeline without a conversation: for evals (DeepEval) and
  // for trying out retrieval settings.
  @Post('knowledge/query')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: KnowledgeAnswerDto })
  async query(@Body() dto: QueryKnowledgeDto): Promise<KnowledgeAnswerDto> {
    const startedAt = performance.now();
    const result = await this.knowledgeService.answer({
      message: dto.question,
      history: dto.history ?? [],
      options: { hybrid: dto.hybrid, hyde: dto.hyde, rerank: dto.rerank },
    });
    const { retrieval } = result;

    return {
      status: result.status,
      reply: result.reply,
      citations: result.citations,
      review: result.review,
      rewrittenQuery: retrieval.rewrittenQuery,
      hypotheticalAnswer: retrieval.hypotheticalAnswer,
      candidates: retrieval.candidates,
      contexts: retrieval.chunks.map(({ text }) => text),
      chunks: retrieval.chunks,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}
