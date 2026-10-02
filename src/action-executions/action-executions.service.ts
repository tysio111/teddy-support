import { ActionsService } from '../actions/actions.service';
import { Action } from '../actions/domain/action';
import { DetectedIntentsService } from '../detected-intents/detected-intents.service';
import { DetectedIntent } from '../detected-intents/domain/detected-intent';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateActionExecutionDto } from './dto/create-action-execution.dto';
import { UpdateActionExecutionDto } from './dto/update-action-execution.dto';
import { ActionExecutionRepository } from './infrastructure/persistence/action-execution.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { ActionExecution } from './domain/action-execution';

@Injectable()
export class ActionExecutionsService {
  constructor(
    private readonly actionService: ActionsService,

    private readonly detectedIntentService: DetectedIntentsService,

    // Dependencies here
    private readonly actionExecutionRepository: ActionExecutionRepository,
  ) {}

  async create(createActionExecutionDto: CreateActionExecutionDto) {
    // Do not remove comment below.
    // <creating-property />

    let action: Action | undefined = undefined;

    if (createActionExecutionDto.action) {
      const actionObject = await this.actionService.findById(
        createActionExecutionDto.action.id,
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

    let detectedIntent: DetectedIntent | undefined = undefined;

    if (createActionExecutionDto.detectedIntent) {
      const detectedIntentObject = await this.detectedIntentService.findById(
        createActionExecutionDto.detectedIntent.id,
      );
      if (!detectedIntentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            detectedIntent: 'notExists',
          },
        });
      }
      detectedIntent = detectedIntentObject;
    }

    return this.actionExecutionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      executedAt: createActionExecutionDto.executedAt,

      errorMessage: createActionExecutionDto.errorMessage,

      responsePayload: createActionExecutionDto.responsePayload,

      responseStatusCode: createActionExecutionDto.responseStatusCode,

      status: createActionExecutionDto.status,

      requestPayload: createActionExecutionDto.requestPayload,

      action,

      detectedIntent,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.actionExecutionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: ActionExecution['id']) {
    return this.actionExecutionRepository.findById(id);
  }

  findByIds(ids: ActionExecution['id'][]) {
    return this.actionExecutionRepository.findByIds(ids);
  }

  async update(
    id: ActionExecution['id'],

    updateActionExecutionDto: UpdateActionExecutionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let action: Action | undefined = undefined;

    if (updateActionExecutionDto.action) {
      const actionObject = await this.actionService.findById(
        updateActionExecutionDto.action.id,
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

    let detectedIntent: DetectedIntent | undefined = undefined;

    if (updateActionExecutionDto.detectedIntent) {
      const detectedIntentObject = await this.detectedIntentService.findById(
        updateActionExecutionDto.detectedIntent.id,
      );
      if (!detectedIntentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            detectedIntent: 'notExists',
          },
        });
      }
      detectedIntent = detectedIntentObject;
    }

    return this.actionExecutionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      executedAt: updateActionExecutionDto.executedAt,

      errorMessage: updateActionExecutionDto.errorMessage,

      responsePayload: updateActionExecutionDto.responsePayload,

      responseStatusCode: updateActionExecutionDto.responseStatusCode,

      status: updateActionExecutionDto.status,

      requestPayload: updateActionExecutionDto.requestPayload,

      action,

      detectedIntent,
    });
  }

  remove(id: ActionExecution['id']) {
    return this.actionExecutionRepository.remove(id);
  }
}
