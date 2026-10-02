import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Action } from '../../domain/action';

export abstract class ActionRepository {
  abstract create(
    data: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Action>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Action[]>;

  abstract findById(id: Action['id']): Promise<NullableType<Action>>;

  abstract findByIds(ids: Action['id'][]): Promise<Action[]>;

  abstract update(
    id: Action['id'],
    payload: DeepPartial<Action>,
  ): Promise<Action | null>;

  abstract remove(id: Action['id']): Promise<void>;
}
