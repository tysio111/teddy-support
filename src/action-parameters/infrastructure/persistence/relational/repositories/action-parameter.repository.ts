import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ActionParameterEntity } from '../entities/action-parameter.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ActionParameter } from '../../../../domain/action-parameter';
import { ActionParameterRepository } from '../../action-parameter.repository';
import { ActionParameterMapper } from '../mappers/action-parameter.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ActionParameterRelationalRepository implements ActionParameterRepository {
  constructor(
    @InjectRepository(ActionParameterEntity)
    private readonly actionParameterRepository: Repository<ActionParameterEntity>,
  ) {}

  async create(data: ActionParameter): Promise<ActionParameter> {
    const persistenceModel = ActionParameterMapper.toPersistence(data);
    const newEntity = await this.actionParameterRepository.save(
      this.actionParameterRepository.create(persistenceModel),
    );
    return ActionParameterMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ActionParameter[]> {
    const entities = await this.actionParameterRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => ActionParameterMapper.toDomain(entity));
  }

  async findById(
    id: ActionParameter['id'],
  ): Promise<NullableType<ActionParameter>> {
    const entity = await this.actionParameterRepository.findOne({
      where: { id },
    });

    return entity ? ActionParameterMapper.toDomain(entity) : null;
  }

  async findByIds(ids: ActionParameter['id'][]): Promise<ActionParameter[]> {
    const entities = await this.actionParameterRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ActionParameterMapper.toDomain(entity));
  }

  async update(
    id: ActionParameter['id'],
    payload: Partial<ActionParameter>,
  ): Promise<ActionParameter> {
    const entity = await this.actionParameterRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.actionParameterRepository.save(
      this.actionParameterRepository.create(
        ActionParameterMapper.toPersistence({
          ...ActionParameterMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ActionParameterMapper.toDomain(updatedEntity);
  }

  async remove(id: ActionParameter['id']): Promise<void> {
    await this.actionParameterRepository.delete(id);
  }
}
