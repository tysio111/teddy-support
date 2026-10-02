import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Action } from '../../domain/action';

export type ActionFilterOptions = {
  status?: Action['status'];
  resourceId?: NonNullable<Action['resource']>['id'];
};

export abstract class ActionRepository {
  abstract create(
    data: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Action>;

  abstract findAllWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: ActionFilterOptions;
  }): Promise<Action[]>;

  abstract findById(id: Action['id']): Promise<NullableType<Action>>;

  abstract findByIds(ids: Action['id'][]): Promise<Action[]>;

  abstract findByStatus(status: Action['status']): Promise<Action[]>;

  abstract findByResourceId(
    resourceId: NonNullable<Action['resource']>['id'],
    status: Action['status'],
  ): Promise<Action[]>;

  abstract update(
    id: Action['id'],
    payload: DeepPartial<Action>,
  ): Promise<Action | null>;

  abstract remove(id: Action['id']): Promise<void>;
}
