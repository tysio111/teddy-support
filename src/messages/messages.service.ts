import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/domain/conversation';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageRepository } from './infrastructure/persistence/message.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Message } from './domain/message';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from './events/message-created.event';
import { MessageSenderEnum } from './message-sender.enum';

@Injectable()
export class MessagesService {
  constructor(
    private readonly conversationService: ConversationsService,

    // Dependencies here
    private readonly messageRepository: MessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createMessageDto: CreateMessageDto) {
    // Do not remove comment below.
    // <creating-property />

    const conversationObject = await this.conversationService.findById(
      createMessageDto.conversation.id,
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
      new MessageCreatedEvent(message.id, conversation.id, message.sender),
    );

    return message;
  }

  // System context (used by intent recognition): the conversation is already
  // resolved, and bot messages never trigger intent recognition.
  async createBotMessage(conversation: Conversation, content: string) {
    const message = await this.messageRepository.create({
      content,
      sender: MessageSenderEnum.bot,
      conversation,
    });

    this.eventEmitter.emit(
      MESSAGE_CREATED_EVENT,
      new MessageCreatedEvent(message.id, conversation.id, message.sender),
    );

    return message;
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.messageRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Message['id']) {
    return this.messageRepository.findById(id);
  }

  findByIds(ids: Message['id'][]) {
    return this.messageRepository.findByIds(ids);
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

    updateMessageDto: UpdateMessageDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let conversation: Conversation | undefined = undefined;

    if (updateMessageDto.conversation) {
      const conversationObject = await this.conversationService.findById(
        updateMessageDto.conversation.id,
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

  remove(id: Message['id']) {
    return this.messageRepository.remove(id);
  }
}
