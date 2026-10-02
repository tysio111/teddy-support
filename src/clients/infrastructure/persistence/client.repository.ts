import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Company } from '../../../companies/domain/company';
import { Client } from '../../domain/client';

export abstract class ClientRepository {
  abstract create(
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Client>;

  abstract findAllWithPagination({
    paginationOptions,
    companyId,
  }: {
    paginationOptions: IPaginationOptions;
    companyId?: Company['id'];
  }): Promise<Client[]>;

  abstract findById(id: Client['id']): Promise<NullableType<Client>>;

  abstract findByIds(ids: Client['id'][]): Promise<Client[]>;

  abstract update(
    id: Client['id'],
    payload: DeepPartial<Client>,
  ): Promise<Client | null>;

  abstract remove(id: Client['id']): Promise<void>;
}
