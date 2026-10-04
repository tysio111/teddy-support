import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HandoffEntity } from '../entities/handoff.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Handoff } from '../../../../domain/handoff';
import {
  HandoffFilterOptions,
  HandoffRepository,
} from '../../handoff.repository';
import { ACTIVE_HANDOFF_STATUSES } from '../../../../handoff-status.enum';
import { HandoffMapper } from '../mappers/handoff.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class HandoffRelationalRepository implements HandoffRepository {
  constructor(
    @InjectRepository(HandoffEntity)
    private readonly handoffRepository: Repository<HandoffEntity>,
  ) {}

  async create(data: Handoff): Promise<Handoff> {
    const persistenceModel = HandoffMapper.toPersistence(data);
    const newEntity = await this.handoffRepository.save(
      this.handoffRepository.create(persistenceModel),
    );
    return HandoffMapper.toDomain(newEntity);
  }

  // Inbox order: oldest first, so the longest-waiting client is served first.
  async findAllWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: HandoffFilterOptions;
  }): Promise<Handoff[]> {
    const entities = await this.handoffRepository.find({
      where: {
        status: filterOptions?.status,
        assignee: filterOptions?.assigneeId
          ? { id: Number(filterOptions.assigneeId) }
          : undefined,
      },
      order: { createdAt: 'ASC' },
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => HandoffMapper.toDomain(entity));
  }

  async findActiveByConversationId(
    conversationId: NonNullable<Handoff['conversation']>['id'],
  ): Promise<NullableType<Handoff>> {
    const entity = await this.handoffRepository.findOne({
      where: {
        conversation: { id: conversationId },
        status: In(ACTIVE_HANDOFF_STATUSES),
      },
      order: { createdAt: 'DESC' },
    });

    return entity ? HandoffMapper.toDomain(entity) : null;
  }

  async findById(id: Handoff['id']): Promise<NullableType<Handoff>> {
    const entity = await this.handoffRepository.findOne({
      where: { id },
    });

    return entity ? HandoffMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Handoff['id'][]): Promise<Handoff[]> {
    const entities = await this.handoffRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => HandoffMapper.toDomain(entity));
  }

  async update(id: Handoff['id'], payload: Partial<Handoff>): Promise<Handoff> {
    const entity = await this.handoffRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.handoffRepository.save(
      this.handoffRepository.create(
        HandoffMapper.toPersistence({
          ...HandoffMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return HandoffMapper.toDomain(updatedEntity);
  }

  async remove(id: Handoff['id']): Promise<void> {
    await this.handoffRepository.delete(id);
  }
}
