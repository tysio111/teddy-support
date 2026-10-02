import { CompaniesService } from '../companies/companies.service';

import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { ActionRepository } from './infrastructure/persistence/action.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Action } from './domain/action';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';

@Injectable()
export class ActionsService {
  constructor(
    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly actionRepository: ActionRepository,
  ) {}

  async create(currentUser: JwtPayloadType, createActionDto: CreateActionDto) {
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

    return this.actionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      status: createActionDto.status,

      confidenceThreshold: createActionDto.confidenceThreshold,

      authCredential: createActionDto.authCredential,

      authType: createActionDto.authType,

      httpMethod: createActionDto.httpMethod,

      endpointUrl: createActionDto.endpointUrl,

      description: createActionDto.description,

      name: createActionDto.name,

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
    return this.actionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      companyId: isPlatformAdmin(currentUser)
        ? undefined
        : (currentUser.companyId ?? undefined),
    });
  }

  async findById(id: Action['id'], currentUser: JwtPayloadType) {
    const action = await this.actionRepository.findById(id);

    if (
      action &&
      !isPlatformAdmin(currentUser) &&
      String(action.company?.id) !== String(currentUser.companyId)
    ) {
      throw new NotFoundException();
    }

    return action;
  }

  findByIds(ids: Action['id'][]) {
    return this.actionRepository.findByIds(ids);
  }

  async update(
    id: Action['id'],
    currentUser: JwtPayloadType,
    updateActionDto: UpdateActionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    await this.findById(id, currentUser); // throws NotFoundException if foreign

    // An action can never be reassigned to a different company via update.
    return this.actionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      status: updateActionDto.status,

      confidenceThreshold: updateActionDto.confidenceThreshold,

      authCredential: updateActionDto.authCredential,

      authType: updateActionDto.authType,

      httpMethod: updateActionDto.httpMethod,

      endpointUrl: updateActionDto.endpointUrl,

      description: updateActionDto.description,

      name: updateActionDto.name,
    });
  }

  async remove(id: Action['id'], currentUser: JwtPayloadType) {
    await this.findById(id, currentUser); // throws NotFoundException if foreign

    return this.actionRepository.remove(id);
  }
}
