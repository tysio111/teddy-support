import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ActionExecutionEntity } from '../entities/action-execution.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ActionExecution } from '../../../../domain/action-execution';
import {
  ActionExecutionRepository,
  ActionExecutionStats,
} from '../../action-execution.repository';
import { ActionExecutionStatusEnum } from '../../../../action-execution-status.enum';
import { ActionExecutionMapper } from '../mappers/action-execution.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ActionExecutionRelationalRepository implements ActionExecutionRepository {
  constructor(
    @InjectRepository(ActionExecutionEntity)
    private readonly actionExecutionRepository: Repository<ActionExecutionEntity>,
  ) {}

  async create(data: ActionExecution): Promise<ActionExecution> {
    const persistenceModel = ActionExecutionMapper.toPersistence(data);
    const newEntity = await this.actionExecutionRepository.save(
      this.actionExecutionRepository.create(persistenceModel),
    );
    return ActionExecutionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ActionExecution[]> {
    const entities = await this.actionExecutionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ActionExecutionMapper.toDomain(entity));
  }

  async findById(
    id: ActionExecution['id'],
  ): Promise<NullableType<ActionExecution>> {
    const entity = await this.actionExecutionRepository.findOne({
      where: { id },
    });

    return entity ? ActionExecutionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: ActionExecution['id'][]): Promise<ActionExecution[]> {
    const entities = await this.actionExecutionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ActionExecutionMapper.toDomain(entity));
  }

  async getRecentStatsByActionId(
    actionId: NonNullable<ActionExecution['action']>['id'],
    since: Date,
  ): Promise<ActionExecutionStats> {
    const row = await this.actionExecutionRepository
      .createQueryBuilder('execution')
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE "execution"."status" = :failed)',
        'failed',
      )
      .addSelect(
        'MAX("execution"."createdAt") FILTER (WHERE "execution"."status" = :failed)',
        'lastFailedAt',
      )
      .where('"execution"."actionId" = :actionId', { actionId })
      .andWhere('"execution"."createdAt" >= :since', { since })
      .setParameter('failed', ActionExecutionStatusEnum.failed)
      .getRawOne<{
        total: string;
        failed: string;
        lastFailedAt: Date | null;
      }>();

    return {
      total: Number(row?.total ?? 0),
      failed: Number(row?.failed ?? 0),
      lastFailedAt: row?.lastFailedAt ? new Date(row.lastFailedAt) : null,
    };
  }

  async update(
    id: ActionExecution['id'],
    payload: Partial<ActionExecution>,
  ): Promise<ActionExecution> {
    const entity = await this.actionExecutionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.actionExecutionRepository.save(
      this.actionExecutionRepository.create(
        ActionExecutionMapper.toPersistence({
          ...ActionExecutionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ActionExecutionMapper.toDomain(updatedEntity);
  }

  async remove(id: ActionExecution['id']): Promise<void> {
    await this.actionExecutionRepository.delete(id);
  }
}
