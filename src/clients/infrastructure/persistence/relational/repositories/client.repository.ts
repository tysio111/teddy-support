import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClientEntity } from '../entities/client.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Client } from '../../../../domain/client';
import { ClientRepository } from '../../client.repository';
import { ClientMapper } from '../mappers/client.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ClientRelationalRepository implements ClientRepository {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>,
  ) {}

  async create(data: Client): Promise<Client> {
    const persistenceModel = ClientMapper.toPersistence(data);
    const newEntity = await this.clientRepository.save(
      this.clientRepository.create(persistenceModel),
    );
    return ClientMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Client[]> {
    const entities = await this.clientRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ClientMapper.toDomain(entity));
  }

  async findById(id: Client['id']): Promise<NullableType<Client>> {
    const entity = await this.clientRepository.findOne({
      where: { id },
    });

    return entity ? ClientMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Client['id'][]): Promise<Client[]> {
    const entities = await this.clientRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ClientMapper.toDomain(entity));
  }

  async update(id: Client['id'], payload: Partial<Client>): Promise<Client> {
    const entity = await this.clientRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.clientRepository.save(
      this.clientRepository.create(
        ClientMapper.toPersistence({
          ...ClientMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ClientMapper.toDomain(updatedEntity);
  }

  async remove(id: Client['id']): Promise<void> {
    await this.clientRepository.delete(id);
  }
}
