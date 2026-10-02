import { ActionsService } from '../actions/actions.service';
import { Action } from '../actions/domain/action';
import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateActionParameterDto } from './dto/create-action-parameter.dto';
import { UpdateActionParameterDto } from './dto/update-action-parameter.dto';
import { ActionParameterRepository } from './infrastructure/persistence/action-parameter.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { ActionParameter } from './domain/action-parameter';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';

@Injectable()
export class ActionParametersService {
  constructor(
    private readonly actionService: ActionsService,

    // Dependencies here
    private readonly actionParameterRepository: ActionParameterRepository,
  ) {}

  async create(
    currentUser: JwtPayloadType,
    createActionParameterDto: CreateActionParameterDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    // findById enforces that the action belongs to the caller's company.
    const actionObject = await this.actionService.findById(
      createActionParameterDto.action.id,
      currentUser,
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
    currentUser,
  }: {
    paginationOptions: IPaginationOptions;
    currentUser: JwtPayloadType;
  }) {
    return this.actionParameterRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      companyId: isPlatformAdmin(currentUser)
        ? undefined
        : (currentUser.companyId ?? undefined),
    });
  }

  async findById(id: ActionParameter['id'], currentUser: JwtPayloadType) {
    const actionParameter = await this.actionParameterRepository.findById(id);

    if (
      actionParameter &&
      !isPlatformAdmin(currentUser) &&
      String(actionParameter.action?.company?.id) !==
        String(currentUser.companyId)
    ) {
      throw new NotFoundException();
    }

    return actionParameter;
  }

  findByIds(ids: ActionParameter['id'][]) {
    return this.actionParameterRepository.findByIds(ids);
  }

  async update(
    id: ActionParameter['id'],
    currentUser: JwtPayloadType,
    updateActionParameterDto: UpdateActionParameterDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    await this.findById(id, currentUser); // throws NotFoundException if foreign

    let action: Action | undefined = undefined;

    if (updateActionParameterDto.action) {
      // findById enforces that the action belongs to the caller's company.
      const actionObject = await this.actionService.findById(
        updateActionParameterDto.action.id,
        currentUser,
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

  async remove(id: ActionParameter['id'], currentUser: JwtPayloadType) {
    await this.findById(id, currentUser); // throws NotFoundException if foreign

    return this.actionParameterRepository.remove(id);
  }
}
