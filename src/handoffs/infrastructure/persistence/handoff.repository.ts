import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Handoff } from '../../domain/handoff';

export type HandoffFilterOptions = {
  status?: Handoff['status'];
  assigneeId?: NonNullable<Handoff['assignee']>['id'];
};

export abstract class HandoffRepository {
  abstract create(
    data: Omit<Handoff, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Handoff>;

  abstract findAllWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: HandoffFilterOptions;
  }): Promise<Handoff[]>;

  abstract findActiveByConversationId(
    conversationId: NonNullable<Handoff['conversation']>['id'],
  ): Promise<NullableType<Handoff>>;

  abstract findById(id: Handoff['id']): Promise<NullableType<Handoff>>;

  abstract findByIds(ids: Handoff['id'][]): Promise<Handoff[]>;

  abstract update(
    id: Handoff['id'],
    payload: DeepPartial<Handoff>,
  ): Promise<Handoff | null>;

  abstract remove(id: Handoff['id']): Promise<void>;
}
