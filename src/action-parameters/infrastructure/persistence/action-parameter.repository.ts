import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { ActionParameter } from '../../domain/action-parameter';

export abstract class ActionParameterRepository {
  abstract create(
    data: Omit<ActionParameter, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ActionParameter>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ActionParameter[]>;

  abstract findById(
    id: ActionParameter['id'],
  ): Promise<NullableType<ActionParameter>>;

  abstract findByIds(ids: ActionParameter['id'][]): Promise<ActionParameter[]>;

  abstract update(
    id: ActionParameter['id'],
    payload: DeepPartial<ActionParameter>,
  ): Promise<ActionParameter | null>;

  abstract remove(id: ActionParameter['id']): Promise<void>;
}
