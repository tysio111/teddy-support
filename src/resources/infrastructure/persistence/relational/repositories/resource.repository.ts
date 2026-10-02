import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ResourceEntity } from '../entities/resource.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Resource } from '../../../../domain/resource';
import { ResourceRepository } from '../../resource.repository';
import { ResourceMapper } from '../mappers/resource.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { Company } from '../../../../../companies/domain/company';

@Injectable()
export class ResourceRelationalRepository implements ResourceRepository {
  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepository: Repository<ResourceEntity>,
  ) {}

  async create(data: Resource): Promise<Resource> {
    const persistenceModel = ResourceMapper.toPersistence(data);
    const newEntity = await this.resourceRepository.save(
      this.resourceRepository.create(persistenceModel),
    );
    return ResourceMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
    companyId,
  }: {
    paginationOptions: IPaginationOptions;
    companyId?: Company['id'];
  }): Promise<Resource[]> {
    const entities = await this.resourceRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: companyId ? { company: { id: companyId } } : undefined,
    });

    return entities.map((entity) => ResourceMapper.toDomain(entity));
  }

  async findById(id: Resource['id']): Promise<NullableType<Resource>> {
    const entity = await this.resourceRepository.findOne({
      where: { id },
    });

    return entity ? ResourceMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Resource['id'][]): Promise<Resource[]> {
    const entities = await this.resourceRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ResourceMapper.toDomain(entity));
  }

  async update(
    id: Resource['id'],
    payload: Partial<Resource>,
  ): Promise<Resource> {
    const entity = await this.resourceRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.resourceRepository.save(
      this.resourceRepository.create(
        ResourceMapper.toPersistence({
          ...ResourceMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ResourceMapper.toDomain(updatedEntity);
  }

  async remove(id: Resource['id']): Promise<void> {
    await this.resourceRepository.delete(id);
  }
}
