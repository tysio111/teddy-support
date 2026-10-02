import { ActionsService } from '../actions/actions.service';
import { Action } from '../actions/domain/action';

import { MessagesService } from '../messages/messages.service';
import { Message } from '../messages/domain/message';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateDetectedIntentDto } from './dto/create-detected-intent.dto';
import { UpdateDetectedIntentDto } from './dto/update-detected-intent.dto';
import { DetectedIntentRepository } from './infrastructure/persistence/detected-intent.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DetectedIntent } from './domain/detected-intent';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

@Injectable()
export class DetectedIntentsService {
  constructor(
    private readonly actionService: ActionsService,

    private readonly messageService: MessagesService,

    // Dependencies here
    private readonly detectedIntentRepository: DetectedIntentRepository,
  ) {}

  async create(
    currentUser: JwtPayloadType,
    createDetectedIntentDto: CreateDetectedIntentDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    let action: Action | null | undefined = undefined;

    if (createDetectedIntentDto.action) {
      const actionObject = await this.actionService.findById(
        createDetectedIntentDto.action.id,
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
    } else if (createDetectedIntentDto.action === null) {
      action = null;
    }

    let message: Message | undefined = undefined;

    if (createDetectedIntentDto.message) {
      const messageObject = await this.messageService.findById(
        createDetectedIntentDto.message.id,
        currentUser,
      );
      if (!messageObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            message: 'notExists',
          },
        });
      }
      message = messageObject;
    }

    return this.detectedIntentRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      status: createDetectedIntentDto.status,

      rank: createDetectedIntentDto.rank,

      confidenceScore: createDetectedIntentDto.confidenceScore,

      action,

      message,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.detectedIntentRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: DetectedIntent['id']) {
    return this.detectedIntentRepository.findById(id);
  }

  findByIds(ids: DetectedIntent['id'][]) {
    return this.detectedIntentRepository.findByIds(ids);
  }

  async update(
    id: DetectedIntent['id'],
    currentUser: JwtPayloadType,
    updateDetectedIntentDto: UpdateDetectedIntentDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let action: Action | null | undefined = undefined;

    if (updateDetectedIntentDto.action) {
      const actionObject = await this.actionService.findById(
        updateDetectedIntentDto.action.id,
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
    } else if (updateDetectedIntentDto.action === null) {
      action = null;
    }

    let message: Message | undefined = undefined;

    if (updateDetectedIntentDto.message) {
      const messageObject = await this.messageService.findById(
        updateDetectedIntentDto.message.id,
        currentUser,
      );
      if (!messageObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            message: 'notExists',
          },
        });
      }
      message = messageObject;
    }

    return this.detectedIntentRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      status: updateDetectedIntentDto.status,

      rank: updateDetectedIntentDto.rank,

      confidenceScore: updateDetectedIntentDto.confidenceScore,

      action,

      message,
    });
  }

  remove(id: DetectedIntent['id']) {
    return this.detectedIntentRepository.remove(id);
  }
}
