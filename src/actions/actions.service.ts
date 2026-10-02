import { ResourcesService } from '../resources/resources.service';
import { Resource } from '../resources/domain/resource';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import {
  ActionFilterOptions,
  ActionRepository,
} from './infrastructure/persistence/action.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Action } from './domain/action';
import { ActionStatusEnum } from './action-status.enum';

@Injectable()
export class ActionsService {
  constructor(
    private readonly resourceService: ResourcesService,

    // Dependencies here
    private readonly actionRepository: ActionRepository,
  ) {}

  async create(createActionDto: CreateActionDto) {
    // Do not remove comment below.
    // <creating-property />
    let resource: Resource | null | undefined = undefined;

    if (createActionDto.resource) {
      const resourceObject = await this.resourceService.findById(
        createActionDto.resource.id,
      );
      if (!resourceObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            resource: 'notExists',
          },
        });
      }
      resource = resourceObject;
    } else if (createActionDto.resource === null) {
      resource = null;
    }

    return this.actionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      resource,

      requiresConfirmation: createActionDto.requiresConfirmation,

      status: createActionDto.status,

      confidenceThreshold: createActionDto.confidenceThreshold,

      authCredential: createActionDto.authCredential,

      authType: createActionDto.authType,

      httpMethod: createActionDto.httpMethod,

      endpointUrl: createActionDto.endpointUrl,

      description: createActionDto.description,

      name: createActionDto.name,
    });
  }

  findAllWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: ActionFilterOptions;
  }) {
    return this.actionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      filterOptions,
    });
  }

  findById(id: Action['id']) {
    return this.actionRepository.findById(id);
  }

  findByIds(ids: Action['id'][]) {
    return this.actionRepository.findByIds(ids);
  }

  findActive() {
    return this.actionRepository.findByStatus(ActionStatusEnum.active);
  }

  findDraftsByResource(resourceId: Resource['id']) {
    return this.actionRepository.findByResourceId(
      resourceId,
      ActionStatusEnum.draft,
    );
  }

  async update(
    id: Action['id'],

    updateActionDto: UpdateActionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let resource: Resource | null | undefined = undefined;

    if (updateActionDto.resource) {
      const resourceObject = await this.resourceService.findById(
        updateActionDto.resource.id,
      );
      if (!resourceObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            resource: 'notExists',
          },
        });
      }
      resource = resourceObject;
    } else if (updateActionDto.resource === null) {
      resource = null;
    }

    return this.actionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      resource,

      requiresConfirmation: updateActionDto.requiresConfirmation,

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

  remove(id: Action['id']) {
    return this.actionRepository.remove(id);
  }
}
