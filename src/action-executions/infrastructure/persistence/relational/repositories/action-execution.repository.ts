import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ActionExecutionEntity } from '../entities/action-execution.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ActionExecution } from '../../../../domain/action-execution';
import { ActionExecutionRepository } from '../../action-execution.repository';
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
