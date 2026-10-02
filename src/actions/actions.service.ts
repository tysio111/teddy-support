import { CompaniesService } from '../companies/companies.service';
import { Company } from '../companies/domain/company';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { ActionRepository } from './infrastructure/persistence/action.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Action } from './domain/action';

@Injectable()
export class ActionsService {
  constructor(
    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly actionRepository: ActionRepository,
  ) {}

  async create(createActionDto: CreateActionDto) {
    // Do not remove comment below.
    // <creating-property />

    const companyObject = await this.companyService.findById(
      createActionDto.company.id,
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
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.actionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Action['id']) {
    return this.actionRepository.findById(id);
  }

  findByIds(ids: Action['id'][]) {
    return this.actionRepository.findByIds(ids);
  }

  async update(
    id: Action['id'],

    updateActionDto: UpdateActionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let company: Company | undefined = undefined;

    if (updateActionDto.company) {
      const companyObject = await this.companyService.findById(
        updateActionDto.company.id,
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

      company,
    });
  }

  remove(id: Action['id']) {
    return this.actionRepository.remove(id);
  }
}
