import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { DetectedIntent } from '../../domain/detected-intent';

export abstract class DetectedIntentRepository {
  abstract create(
    data: Omit<DetectedIntent, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DetectedIntent>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<DetectedIntent[]>;

  abstract findById(
    id: DetectedIntent['id'],
  ): Promise<NullableType<DetectedIntent>>;

  abstract findByIds(ids: DetectedIntent['id'][]): Promise<DetectedIntent[]>;

  abstract findByMessageId(
    messageId: NonNullable<DetectedIntent['message']>['id'],
  ): Promise<DetectedIntent[]>;

  abstract update(
    id: DetectedIntent['id'],
    payload: DeepPartial<DetectedIntent>,
  ): Promise<DetectedIntent | null>;

  abstract remove(id: DetectedIntent['id']): Promise<void>;
}
