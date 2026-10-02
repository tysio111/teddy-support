import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientRepository } from './infrastructure/persistence/client.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Client } from './domain/client';

@Injectable()
export class ClientsService {
  constructor(
    // Dependencies here
    private readonly clientRepository: ClientRepository,
  ) {}

  async create(createClientDto: CreateClientDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.clientRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      email: createClientDto.email,

      name: createClientDto.name,

      externalReference: createClientDto.externalReference,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.clientRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Client['id']) {
    return this.clientRepository.findById(id);
  }

  findByIds(ids: Client['id'][]) {
    return this.clientRepository.findByIds(ids);
  }

  async update(
    id: Client['id'],

    updateClientDto: UpdateClientDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.clientRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      email: updateClientDto.email,

      name: updateClientDto.name,

      externalReference: updateClientDto.externalReference,
    });
  }

  remove(id: Client['id']) {
    return this.clientRepository.remove(id);
  }
}
