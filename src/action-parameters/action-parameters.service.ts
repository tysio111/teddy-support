import { ActionsService } from '../actions/actions.service';
import { Action } from '../actions/domain/action';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateActionParameterDto } from './dto/create-action-parameter.dto';
import { UpdateActionParameterDto } from './dto/update-action-parameter.dto';
import { ActionParameterRepository } from './infrastructure/persistence/action-parameter.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { ActionParameter } from './domain/action-parameter';

@Injectable()
export class ActionParametersService {
  constructor(
    private readonly actionService: ActionsService,

    // Dependencies here
    private readonly actionParameterRepository: ActionParameterRepository,
  ) {}

  async create(createActionParameterDto: CreateActionParameterDto) {
    // Do not remove comment below.
    // <creating-property />

    const actionObject = await this.actionService.findById(
      createActionParameterDto.action.id,
    );
    if (!actionObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          action: 'notExists',
        },
      });
    }
    const action = actionObject;

    return this.actionParameterRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      order: createActionParameterDto.order,

      enumValues: createActionParameterDto.enumValues,

      isRequired: createActionParameterDto.isRequired,

      description: createActionParameterDto.description,

      type: createActionParameterDto.type,

      name: createActionParameterDto.name,

      action,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.actionParameterRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: ActionParameter['id']) {
    return this.actionParameterRepository.findById(id);
  }

  findByIds(ids: ActionParameter['id'][]) {
    return this.actionParameterRepository.findByIds(ids);
  }

  async update(
    id: ActionParameter['id'],

    updateActionParameterDto: UpdateActionParameterDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let action: Action | undefined = undefined;

    if (updateActionParameterDto.action) {
      const actionObject = await this.actionService.findById(
        updateActionParameterDto.action.id,
      );
      if (!actionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            action: 'notExists',
          },
        });
      }
      action = actionObject;
    }

    return this.actionParameterRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      order: updateActionParameterDto.order,

      enumValues: updateActionParameterDto.enumValues,

      isRequired: updateActionParameterDto.isRequired,

      description: updateActionParameterDto.description,

      type: updateActionParameterDto.type,

      name: updateActionParameterDto.name,

      action,
    });
  }

  remove(id: ActionParameter['id']) {
    return this.actionParameterRepository.remove(id);
  }
}
