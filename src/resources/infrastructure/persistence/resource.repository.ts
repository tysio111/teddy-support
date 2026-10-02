import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Company } from '../../../companies/domain/company';
import { Resource } from '../../domain/resource';

export abstract class ResourceRepository {
  abstract create(
    data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Resource>;

  abstract findAllWithPagination({
    paginationOptions,
    companyId,
  }: {
    paginationOptions: IPaginationOptions;
    companyId?: Company['id'];
  }): Promise<Resource[]>;

  abstract findById(id: Resource['id']): Promise<NullableType<Resource>>;

  abstract findByIds(ids: Resource['id'][]): Promise<Resource[]>;

  abstract update(
    id: Resource['id'],
    payload: DeepPartial<Resource>,
  ): Promise<Resource | null>;

  abstract remove(id: Resource['id']): Promise<void>;
}
