import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/domain/conversation';

import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageRepository } from './infrastructure/persistence/message.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Message } from './domain/message';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from './events/message-created.event';

@Injectable()
export class MessagesService {
  constructor(
    private readonly conversationService: ConversationsService,

    // Dependencies here
    private readonly messageRepository: MessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    currentUser: JwtPayloadType,
    createMessageDto: CreateMessageDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    // findById enforces that the conversation belongs to the caller's
    // company.
    const conversationObject = await this.conversationService.findById(
      createMessageDto.conversation.id,
      currentUser,
    );
    if (!conversationObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          conversation: 'notExists',
        },
      });
    }
    const conversation = conversationObject;

    const message = await this.messageRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      content: createMessageDto.content,

      sender: createMessageDto.sender,

      conversation,
    });

    this.eventEmitter.emit(
      MESSAGE_CREATED_EVENT,
      new MessageCreatedEvent(
        message.id,
        conversation.id,
        conversation.company.id,
        message.sender,
      ),
    );

    return message;
  }

  findAllWithPagination({
    paginationOptions,
    currentUser,
  }: {
    paginationOptions: IPaginationOptions;
    currentUser: JwtPayloadType;
  }) {
    return this.messageRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      companyId: isPlatformAdmin(currentUser)
        ? undefined
        : (currentUser.companyId ?? undefined),
    });
  }

  async findById(id: Message['id'], currentUser: JwtPayloadType) {
    const message = await this.messageRepository.findById(id);

    if (
      message &&
      !isPlatformAdmin(currentUser) &&
      String(message.conversation?.company?.id) !==
        String(currentUser.companyId)
    ) {
      throw new NotFoundException();
    }

    return message;
  }

  findByIds(ids: Message['id'][]) {
    return this.messageRepository.findByIds(ids);
  }

  // System context (no current user): skips the company ownership check.
  findByIdUnscoped(id: Message['id']) {
    return this.messageRepository.findById(id);
  }

  findRecentByConversationId(
    conversationId: Conversation['id'],
    limit: number,
  ) {
    return this.messageRepository.findRecentByConversationId(
      conversationId,
      limit,
    );
  }

  async update(
    id: Message['id'],
    currentUser: JwtPayloadType,
    updateMessageDto: UpdateMessageDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    await this.findById(id, currentUser); // throws NotFoundException if foreign

    let conversation: Conversation | undefined = undefined;

    if (updateMessageDto.conversation) {
      // findById enforces that the conversation belongs to the caller's
      // company.
      const conversationObject = await this.conversationService.findById(
        updateMessageDto.conversation.id,
        currentUser,
      );
      if (!conversationObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            conversation: 'notExists',
          },
        });
      }
      conversation = conversationObject;
    }

    return this.messageRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      content: updateMessageDto.content,

      sender: updateMessageDto.sender,

      conversation,
    });
  }

  async remove(id: Message['id'], currentUser: JwtPayloadType) {
    await this.findById(id, currentUser); // throws NotFoundException if foreign

    return this.messageRepository.remove(id);
  }
}
