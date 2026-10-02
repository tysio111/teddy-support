import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { ActionExecution } from '../../domain/action-execution';

export type ActionExecutionStats = {
  total: number;
  failed: number;
  lastFailedAt: Date | null;
};

export abstract class ActionExecutionRepository {
  abstract create(
    data: Omit<ActionExecution, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ActionExecution>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ActionExecution[]>;

  abstract findById(
    id: ActionExecution['id'],
  ): Promise<NullableType<ActionExecution>>;

  abstract findByIds(ids: ActionExecution['id'][]): Promise<ActionExecution[]>;

  abstract getRecentStatsByActionId(
    actionId: NonNullable<ActionExecution['action']>['id'],
    since: Date,
  ): Promise<ActionExecutionStats>;

  abstract update(
    id: ActionExecution['id'],
    payload: DeepPartial<ActionExecution>,
  ): Promise<ActionExecution | null>;

  abstract remove(id: ActionExecution['id']): Promise<void>;
}
