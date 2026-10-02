import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CompanyMember } from '../../domain/company-member';

export abstract class CompanyMemberRepository {
  abstract create(
    data: Omit<CompanyMember, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CompanyMember>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CompanyMember[]>;

  abstract findById(
    id: CompanyMember['id'],
  ): Promise<NullableType<CompanyMember>>;

  abstract findByIds(ids: CompanyMember['id'][]): Promise<CompanyMember[]>;

  abstract update(
    id: CompanyMember['id'],
    payload: DeepPartial<CompanyMember>,
  ): Promise<CompanyMember | null>;

  abstract remove(id: CompanyMember['id']): Promise<void>;
}
