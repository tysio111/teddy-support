import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ActionEntity } from '../entities/action.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Action } from '../../../../domain/action';
import { ActionFilterOptions, ActionRepository } from '../../action.repository';
import { ActionMapper } from '../mappers/action.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ActionRelationalRepository implements ActionRepository {
  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
  ) {}

  async create(data: Action): Promise<Action> {
    const persistenceModel = ActionMapper.toPersistence(data);
    const newEntity = await this.actionRepository.save(
      this.actionRepository.create(persistenceModel),
    );
    return ActionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: ActionFilterOptions;
  }): Promise<Action[]> {
    const entities = await this.actionRepository.find({
      where: {
        status: filterOptions?.status,
        resource: filterOptions?.resourceId
          ? { id: filterOptions.resourceId }
          : undefined,
      },
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ActionMapper.toDomain(entity));
  }

  async findById(id: Action['id']): Promise<NullableType<Action>> {
    const entity = await this.actionRepository.findOne({
      where: { id },
    });

    return entity ? ActionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Action['id'][]): Promise<Action[]> {
    const entities = await this.actionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ActionMapper.toDomain(entity));
  }

  async findByStatus(status: Action['status']): Promise<Action[]> {
    const entities = await this.actionRepository.find({
      where: { status },
    });

    return entities.map((entity) => ActionMapper.toDomain(entity));
  }

  async findByResourceId(
    resourceId: NonNullable<Action['resource']>['id'],
    status: Action['status'],
  ): Promise<Action[]> {
    const entities = await this.actionRepository.find({
      where: { resource: { id: resourceId }, status },
    });

    return entities.map((entity) => ActionMapper.toDomain(entity));
  }

  async update(id: Action['id'], payload: Partial<Action>): Promise<Action> {
    const entity = await this.actionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.actionRepository.save(
      this.actionRepository.create(
        ActionMapper.toPersistence({
          ...ActionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ActionMapper.toDomain(updatedEntity);
  }

  async remove(id: Action['id']): Promise<void> {
    await this.actionRepository.delete(id);
  }
}
