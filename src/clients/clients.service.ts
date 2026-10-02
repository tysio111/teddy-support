import { CompaniesService } from '../companies/companies.service';
import { Company } from '../companies/domain/company';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientRepository } from './infrastructure/persistence/client.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Client } from './domain/client';

@Injectable()
export class ClientsService {
  constructor(
    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly clientRepository: ClientRepository,
  ) {}

  async create(createClientDto: CreateClientDto) {
    // Do not remove comment below.
    // <creating-property />

    const companyObject = await this.companyService.findById(
      createClientDto.company.id,
    );
    if (!companyObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }
    const company = companyObject;

    return this.clientRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      email: createClientDto.email,

      name: createClientDto.name,

      externalReference: createClientDto.externalReference,

      company,
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

    let company: Company | undefined = undefined;

    if (updateClientDto.company) {
      const companyObject = await this.companyService.findById(
        updateClientDto.company.id,
      );
      if (!companyObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            company: 'notExists',
          },
        });
      }
      company = companyObject;
    }

    return this.clientRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      email: updateClientDto.email,

      name: updateClientDto.name,

      externalReference: updateClientDto.externalReference,

      company,
    });
  }

  remove(id: Client['id']) {
    return this.clientRepository.remove(id);
  }
}
