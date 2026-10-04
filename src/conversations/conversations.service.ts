import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { ClientsService } from '../clients/clients.service';
import { Client } from '../clients/domain/client';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import {
  ConversationRepository,
  LlmUsageDelta,
} from './infrastructure/persistence/conversation.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Conversation } from './domain/conversation';
import {
  BOT_PAUSED_STATUSES,
  ConversationStatusEnum,
} from './conversation-status.enum';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly userService: UsersService,

    private readonly clientService: ClientsService,

    // Dependencies here
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async create(createConversationDto: CreateConversationDto) {
    // Do not remove comment below.
    // <creating-property />
    let assignee: User | null | undefined = undefined;

    if (createConversationDto.assignee) {
      const assigneeObject = await this.userService.findById(
        createConversationDto.assignee.id,
      );
      if (!assigneeObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            assignee: 'notExists',
          },
        });
      }
      assignee = assigneeObject;
    } else if (createConversationDto.assignee === null) {
      assignee = null;
    }

    let client: Client | null | undefined = undefined;

    if (createConversationDto.client) {
      const clientObject = await this.clientService.findById(
        createConversationDto.client.id,
      );
      if (!clientObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            client: 'notExists',
          },
        });
      }
      client = clientObject;
    } else if (createConversationDto.client === null) {
      client = null;
    }

    return this.conversationRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      assignee,

      lastMessageAt: createConversationDto.lastMessageAt,

      status: createConversationDto.status ?? ConversationStatusEnum.open,

      channel: createConversationDto.channel,

      client,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.conversationRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Conversation['id']) {
    return this.conversationRepository.findById(id);
  }

  findByIds(ids: Conversation['id'][]) {
    return this.conversationRepository.findByIds(ids);
  }

  async update(
    id: Conversation['id'],

    updateConversationDto: UpdateConversationDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let assignee: User | null | undefined = undefined;

    if (updateConversationDto.assignee) {
      const assigneeObject = await this.userService.findById(
        updateConversationDto.assignee.id,
      );
      if (!assigneeObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            assignee: 'notExists',
          },
        });
      }
      assignee = assigneeObject;
    } else if (updateConversationDto.assignee === null) {
      assignee = null;
    }

    let client: Client | null | undefined = undefined;

    if (updateConversationDto.client) {
      const clientObject = await this.clientService.findById(
        updateConversationDto.client.id,
      );
      if (!clientObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            client: 'notExists',
          },
        });
      }
      client = clientObject;
    } else if (updateConversationDto.client === null) {
      client = null;
    }

    return this.conversationRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      assignee,

      lastMessageAt: updateConversationDto.lastMessageAt,

      status: updateConversationDto.status,

      channel: updateConversationDto.channel,

      client,
    });
  }

  // System context (hand-offs, intent recognition): no DTO validation.
  setStatus(
    id: Conversation['id'],
    status: ConversationStatusEnum,
    assignee?: User | null,
  ) {
    return this.conversationRepository.update(id, { status, assignee });
  }

  isBotPaused(conversation: Conversation): boolean {
    return BOT_PAUSED_STATUSES.includes(conversation.status);
  }

  // System context (intent recognition): LLM spend of a graph run.
  addLlmUsage(id: Conversation['id'], usage: LlmUsageDelta) {
    return this.conversationRepository.addLlmUsage(id, usage);
  }

  remove(id: Conversation['id']) {
    return this.conversationRepository.remove(id);
  }
}
