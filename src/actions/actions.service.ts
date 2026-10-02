import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { ActionRepository } from './infrastructure/persistence/action.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Action } from './domain/action';
import { ActionStatusEnum } from './action-status.enum';

@Injectable()
export class ActionsService {
  constructor(
    // Dependencies here
    private readonly actionRepository: ActionRepository,
  ) {}

  async create(createActionDto: CreateActionDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.actionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
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

  findActive() {
    return this.actionRepository.findByStatus(ActionStatusEnum.active);
  }

  async update(
    id: Action['id'],

    updateActionDto: UpdateActionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.actionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
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
