import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CompanyEntity } from '../entities/company.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Company } from '../../../../domain/company';
import { CompanyRepository } from '../../company.repository';
import { CompanyMapper } from '../mappers/company.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CompanyRelationalRepository implements CompanyRepository {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
  ) {}

  async create(data: Company): Promise<Company> {
    const persistenceModel = CompanyMapper.toPersistence(data);
    const newEntity = await this.companyRepository.save(
      this.companyRepository.create(persistenceModel),
    );
    return CompanyMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Company[]> {
    const entities = await this.companyRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => CompanyMapper.toDomain(entity));
  }

  async findById(id: Company['id']): Promise<NullableType<Company>> {
    const entity = await this.companyRepository.findOne({
      where: { id },
    });

    return entity ? CompanyMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Company['id'][]): Promise<Company[]> {
    const entities = await this.companyRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CompanyMapper.toDomain(entity));
  }

  async update(id: Company['id'], payload: Partial<Company>): Promise<Company> {
    const entity = await this.companyRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.companyRepository.save(
      this.companyRepository.create(
        CompanyMapper.toPersistence({
          ...CompanyMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CompanyMapper.toDomain(updatedEntity);
  }

  async remove(id: Company['id']): Promise<void> {
    await this.companyRepository.delete(id);
  }
}
