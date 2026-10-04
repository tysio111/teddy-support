import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HandoffsService } from './handoffs.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Handoff } from './domain/handoff';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllHandoffsDto } from './dto/find-all-handoffs.dto';
import { OpenHandoffDto } from './dto/open-handoff.dto';
import { AssignHandoffDto } from './dto/assign-handoff.dto';
import { ReplyHandoffDto } from './dto/reply-handoff.dto';
import { Message } from '../messages/domain/message';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import type { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

// The agent inbox: escalated conversations waiting for (or owned by) a human.
@ApiTags('Handoffs')
@ApiBearerAuth()
@Roles(RoleEnum.admin, RoleEnum.user)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'handoffs',
  version: '1',
})
export class HandoffsController {
  constructor(private readonly handoffsService: HandoffsService) {}

  // Manual escalation; returns the active hand-off if there already is one.
  @Post()
  @ApiCreatedResponse({
    type: Handoff,
  })
  open(@Body() openHandoffDto: OpenHandoffDto) {
    return this.handoffsService.escalate(openHandoffDto.conversationId);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Handoff),
  })
  async findAll(
    @Query() query: FindAllHandoffsDto,
    @CurrentUser() user: JwtPayloadType,
  ): Promise<InfinityPaginationResponseDto<Handoff>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.handoffsService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
        filterOptions: {
          status: query?.status,
          assigneeId: query?.assignee === 'me' ? user.id : query?.assignee,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Handoff,
  })
  findById(@Param('id') id: string) {
    return this.handoffsService.findById(id);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Handoff,
  })
  assign(
    @Param('id') id: string,
    @Body() assignHandoffDto: AssignHandoffDto,
    @CurrentUser() user: JwtPayloadType,
  ) {
    return this.handoffsService.assign(id, user, assignHandoffDto.userId);
  }

  @Post(':id/messages')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiCreatedResponse({
    type: Message,
  })
  reply(
    @Param('id') id: string,
    @Body() replyHandoffDto: ReplyHandoffDto,
    @CurrentUser() user: JwtPayloadType,
  ) {
    return this.handoffsService.reply(id, user, replyHandoffDto.content);
  }

  // Hands the conversation back to the bot.
  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Handoff,
  })
  release(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
    return this.handoffsService.release(id, user);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Handoff,
  })
  resolve(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
    return this.handoffsService.resolve(id, user);
  }

  // Regenerates the summary in the background.
  @Post(':id/summary')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Handoff,
  })
  regenerateSummary(@Param('id') id: string) {
    return this.handoffsService.regenerateSummary(id);
  }

  // Admin only.
  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
    return this.handoffsService.remove(id, user);
  }
}
