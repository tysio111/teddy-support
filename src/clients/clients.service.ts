import { CompaniesService } from '../companies/companies.service';

import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientRepository } from './infrastructure/persistence/client.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Client } from './domain/client';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';

@Injectable()
export class ClientsService {
  constructor(
    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly clientRepository: ClientRepository,
  ) {}

  async create(currentUser: JwtPayloadType, createClientDto: CreateClientDto) {
    // Do not remove comment below.
    // <creating-property />

    // The company is always the caller's own — a client-supplied `company`
    // field, if any, is ignored.
    if (!currentUser.companyId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }

    const companyObject = await this.companyService.findById(
      currentUser.companyId,
      currentUser,
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
    currentUser,
  }: {
    paginationOptions: IPaginationOptions;
    currentUser: JwtPayloadType;
  }) {
    return this.clientRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      companyId: isPlatformAdmin(currentUser)
        ? undefined
        : (currentUser.companyId ?? undefined),
    });
  }

  async findById(id: Client['id'], currentUser: JwtPayloadType) {
    const client = await this.clientRepository.findById(id);

    if (
      client &&
      !isPlatformAdmin(currentUser) &&
      String(client.company?.id) !== String(currentUser.companyId)
    ) {
      throw new NotFoundException();
    }

    return client;
  }

  findByIds(ids: Client['id'][]) {
    return this.clientRepository.findByIds(ids);
  }

  async update(
    id: Client['id'],
    currentUser: JwtPayloadType,
    updateClientDto: UpdateClientDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    await this.findById(id, currentUser); // throws NotFoundException if foreign

    // A client can never be reassigned to a different company via update.
    return this.clientRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      email: updateClientDto.email,

      name: updateClientDto.name,

      externalReference: updateClientDto.externalReference,
    });
  }

  async remove(id: Client['id'], currentUser: JwtPayloadType) {
    await this.findById(id, currentUser); // throws NotFoundException if foreign

    return this.clientRepository.remove(id);
  }
}
