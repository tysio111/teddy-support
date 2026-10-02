import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DetectedIntentEntity } from '../entities/detected-intent.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { DetectedIntent } from '../../../../domain/detected-intent';
import { DetectedIntentRepository } from '../../detected-intent.repository';
import { DetectedIntentMapper } from '../mappers/detected-intent.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class DetectedIntentRelationalRepository implements DetectedIntentRepository {
  constructor(
    @InjectRepository(DetectedIntentEntity)
    private readonly detectedIntentRepository: Repository<DetectedIntentEntity>,
  ) {}

  async create(data: DetectedIntent): Promise<DetectedIntent> {
    const persistenceModel = DetectedIntentMapper.toPersistence(data);
    const newEntity = await this.detectedIntentRepository.save(
      this.detectedIntentRepository.create(persistenceModel),
    );
    return DetectedIntentMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<DetectedIntent[]> {
    const entities = await this.detectedIntentRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => DetectedIntentMapper.toDomain(entity));
  }

  async findById(
    id: DetectedIntent['id'],
  ): Promise<NullableType<DetectedIntent>> {
    const entity = await this.detectedIntentRepository.findOne({
      where: { id },
    });

    return entity ? DetectedIntentMapper.toDomain(entity) : null;
  }

  async findByIds(ids: DetectedIntent['id'][]): Promise<DetectedIntent[]> {
    const entities = await this.detectedIntentRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => DetectedIntentMapper.toDomain(entity));
  }

  async findByMessageId(
    messageId: NonNullable<DetectedIntent['message']>['id'],
  ): Promise<DetectedIntent[]> {
    const entities = await this.detectedIntentRepository.find({
      where: { message: { id: messageId } },
      order: { rank: 'ASC' },
    });

    return entities.map((entity) => DetectedIntentMapper.toDomain(entity));
  }

  async update(
    id: DetectedIntent['id'],
    payload: Partial<DetectedIntent>,
  ): Promise<DetectedIntent> {
    const entity = await this.detectedIntentRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.detectedIntentRepository.save(
      this.detectedIntentRepository.create(
        DetectedIntentMapper.toPersistence({
          ...DetectedIntentMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return DetectedIntentMapper.toDomain(updatedEntity);
  }

  async remove(id: DetectedIntent['id']): Promise<void> {
    await this.detectedIntentRepository.delete(id);
  }
}
