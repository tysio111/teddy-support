import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Company } from '../../domain/company';

export abstract class CompanyRepository {
  abstract create(
    data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Company>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Company[]>;

  abstract findById(id: Company['id']): Promise<NullableType<Company>>;

  abstract findByIds(ids: Company['id'][]): Promise<Company[]>;

  abstract update(
    id: Company['id'],
    payload: DeepPartial<Company>,
  ): Promise<Company | null>;

  abstract remove(id: Company['id']): Promise<void>;
}
