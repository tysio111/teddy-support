import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Company } from '../../../companies/domain/company';
import { Conversation } from '../../../conversations/domain/conversation';
import { Message } from '../../domain/message';

export abstract class MessageRepository {
  abstract create(
    data: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Message>;

  abstract findAllWithPagination({
    paginationOptions,
    companyId,
  }: {
    paginationOptions: IPaginationOptions;
    companyId?: Company['id'];
  }): Promise<Message[]>;

  abstract findById(id: Message['id']): Promise<NullableType<Message>>;

  abstract findByIds(ids: Message['id'][]): Promise<Message[]>;

  abstract findRecentByConversationId(
    conversationId: Conversation['id'],
    limit: number,
  ): Promise<Message[]>;

  abstract update(
    id: Message['id'],
    payload: DeepPartial<Message>,
  ): Promise<Message | null>;

  abstract remove(id: Message['id']): Promise<void>;
}
