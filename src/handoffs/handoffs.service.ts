import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/domain/conversation';
import { ConversationStatusEnum } from '../conversations/conversation-status.enum';

import {
  // common
  Injectable,
  HttpStatus,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HandoffRepository } from './infrastructure/persistence/handoff.repository';
import type { HandoffFilterOptions } from './infrastructure/persistence/handoff.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Handoff } from './domain/handoff';
import { MessagesService } from '../messages/messages.service';
import type { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { RoleEnum } from '../roles/roles.enum';
import {
  ACTIVE_HANDOFF_STATUSES,
  HandoffStatusEnum,
  HandoffSummaryStatusEnum,
  MANUAL_HANDOFF_REASON,
} from './handoff-status.enum';
import { HandoffContext } from './handoffs.types';
import {
  HANDOFF_OPENED_EVENT,
  HandoffOpenedEvent,
} from './events/handoff-opened.event';
import { HandoffLlmService } from './llm/handoff-llm.service';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';

type Actor = Pick<JwtPayloadType, 'id' | 'role'>;

@Injectable()
export class HandoffsService {
  private readonly logger = new Logger(HandoffsService.name);

  constructor(
    private readonly userService: UsersService,

    private readonly conversationService: ConversationsService,

    // Dependencies here
    private readonly handoffRepository: HandoffRepository,
    private readonly messagesService: MessagesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly handoffLlmService: HandoffLlmService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  // Escalates a conversation to the inbox and pauses the bot. Idempotent: a
  // conversation already waiting for (or owned by) an agent keeps its hand-off.
  async open(
    conversation: Conversation,
    input: { reason: string; context: HandoffContext | null },
  ): Promise<Handoff> {
    const active = await this.handoffRepository.findActiveByConversationId(
      conversation.id,
    );
    if (active) {
      return active;
    }

    const handoff = await this.handoffRepository.create({
      conversation,
      reason: input.reason,
      status: HandoffStatusEnum.pending,
      summaryStatus: HandoffSummaryStatusEnum.pending,
      summary: null,
      context: input.context ? JSON.stringify(input.context) : null,
      assignee: null,
      assignedAt: null,
      closedAt: null,
    });

    await this.conversationService.setStatus(
      conversation.id,
      ConversationStatusEnum.escalated,
      null,
    );

    this.eventEmitter.emit(
      HANDOFF_OPENED_EVENT,
      new HandoffOpenedEvent(handoff.id),
    );

    return handoff;
  }

  // Manual escalation by an agent, e.g. after reading the conversation.
  async escalate(conversationId: Conversation['id']): Promise<Handoff> {
    const conversation =
      await this.conversationService.findById(conversationId);
    if (!conversation) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          conversationId: 'notExists',
        },
      });
    }

    return this.open(conversation, {
      reason: MANUAL_HANDOFF_REASON,
      context: null,
    });
  }

  findAllWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: HandoffFilterOptions;
  }) {
    return this.handoffRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      filterOptions,
    });
  }

  findById(id: Handoff['id']) {
    return this.handoffRepository.findById(id);
  }

  findByIds(ids: Handoff['id'][]) {
    return this.handoffRepository.findByIds(ids);
  }

  // Assigns to `userId`, or to the caller when omitted. Only admins assign
  // other agents or take over a hand-off someone else owns.
  async assign(
    id: Handoff['id'],
    actor: Actor,
    userId?: User['id'],
  ): Promise<Handoff> {
    const handoff = await this.getActive(id);
    const assigneeId = userId ?? actor.id;

    const takesOver =
      handoff.assignee && String(handoff.assignee.id) !== String(actor.id);
    if (
      (String(assigneeId) !== String(actor.id) || takesOver) &&
      !isAdmin(actor)
    ) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          assignee: 'onlyAdminCanReassign',
        },
      });
    }

    const assignee = await this.userService.findById(assigneeId);
    if (!assignee) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          userId: 'notExists',
        },
      });
    }

    return this.setAssignee(handoff, assignee);
  }

  // Sends a message to the client as the agent. A pending hand-off is
  // assigned to whoever replies first.
  async reply(id: Handoff['id'], actor: Actor, content: string) {
    let handoff = await this.getActive(id);

    if (!handoff.assignee) {
      const assignee = await this.userService.findById(actor.id);
      if (!assignee) {
        throw new NotFoundException();
      }
      handoff = await this.setAssignee(handoff, assignee);
    } else {
      this.assertOwner(handoff, actor);
    }

    return this.messagesService.createAgentMessage(
      handoff.conversation!,
      content,
    );
  }

  // Hands the conversation back to the bot without resolving it.
  release(id: Handoff['id'], actor: Actor): Promise<Handoff> {
    return this.close(
      id,
      actor,
      HandoffStatusEnum.released,
      ConversationStatusEnum.open,
    );
  }

  resolve(id: Handoff['id'], actor: Actor): Promise<Handoff> {
    return this.close(
      id,
      actor,
      HandoffStatusEnum.resolved,
      ConversationStatusEnum.resolved,
    );
  }

  async regenerateSummary(id: Handoff['id']): Promise<Handoff> {
    const handoff = await this.getById(id);
    const updated = await this.handoffRepository.update(handoff.id, {
      summaryStatus: HandoffSummaryStatusEnum.pending,
    });

    this.eventEmitter.emit(
      HANDOFF_OPENED_EVENT,
      new HandoffOpenedEvent(handoff.id),
    );

    return updated!;
  }

  // Writes the LLM summary. Never throws: runs detached from the escalation.
  async summarize(id: Handoff['id']): Promise<void> {
    try {
      const handoff = await this.getById(id);
      const history = await this.messagesService.findRecentByConversationId(
        handoff.conversation!.id,
        this.configService.getOrThrow('handoff.summaryHistoryLimit', {
          infer: true,
        }),
      );

      const summary = await this.handoffLlmService.summarize({
        history,
        reason: handoff.reason ?? MANUAL_HANDOFF_REASON,
        context: handoff.context ?? null,
      });

      await this.handoffRepository.update(id, {
        summary: JSON.stringify(summary),
        summaryStatus: HandoffSummaryStatusEnum.ready,
      });
    } catch (error) {
      this.logger.error(
        `Hand-off summary failed for ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.handoffRepository
        .update(id, { summaryStatus: HandoffSummaryStatusEnum.failed })
        .catch(() => undefined);
    }
  }

  remove(id: Handoff['id'], actor: Actor) {
    if (!isAdmin(actor)) {
      throw new ForbiddenException();
    }

    return this.handoffRepository.remove(id);
  }

  private async close(
    id: Handoff['id'],
    actor: Actor,
    status: HandoffStatusEnum,
    conversationStatus: ConversationStatusEnum,
  ): Promise<Handoff> {
    const handoff = await this.getActive(id);
    if (handoff.assignee) {
      this.assertOwner(handoff, actor);
    }

    const updated = await this.handoffRepository.update(handoff.id, {
      status,
      closedAt: new Date(),
    });
    await this.conversationService.setStatus(
      handoff.conversation!.id,
      conversationStatus,
      null,
    );

    return updated!;
  }

  private async setAssignee(handoff: Handoff, assignee: User) {
    const updated = await this.handoffRepository.update(handoff.id, {
      status: HandoffStatusEnum.assigned,
      assignee,
      assignedAt: new Date(),
    });
    await this.conversationService.setStatus(
      handoff.conversation!.id,
      ConversationStatusEnum.assigned,
      assignee,
    );

    return updated!;
  }

  private assertOwner(handoff: Handoff, actor: Actor): void {
    if (String(handoff.assignee?.id) !== String(actor.id) && !isAdmin(actor)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          assignee: 'notAssignedToYou',
        },
      });
    }
  }

  private async getById(id: Handoff['id']): Promise<Handoff> {
    const handoff = await this.handoffRepository.findById(id);
    if (!handoff) {
      throw new NotFoundException();
    }

    return handoff;
  }

  private async getActive(id: Handoff['id']): Promise<Handoff> {
    const handoff = await this.getById(id);
    if (!ACTIVE_HANDOFF_STATUSES.includes(handoff.status!)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          status: 'handoffClosed',
        },
      });
    }

    return handoff;
  }
}

function isAdmin(actor: Actor): boolean {
  return String(actor.role?.id) === String(RoleEnum.admin);
}
