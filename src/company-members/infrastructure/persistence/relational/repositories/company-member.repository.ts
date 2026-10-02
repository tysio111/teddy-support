import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CompanyMemberEntity } from '../entities/company-member.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CompanyMember } from '../../../../domain/company-member';
import { CompanyMemberRepository } from '../../company-member.repository';
import { CompanyMemberMapper } from '../mappers/company-member.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { User } from '../../../../../users/domain/user';
import { Company } from '../../../../../companies/domain/company';

@Injectable()
export class CompanyMemberRelationalRepository implements CompanyMemberRepository {
  constructor(
    @InjectRepository(CompanyMemberEntity)
    private readonly companyMemberRepository: Repository<CompanyMemberEntity>,
  ) {}

  async create(data: CompanyMember): Promise<CompanyMember> {
    const persistenceModel = CompanyMemberMapper.toPersistence(data);
    const newEntity = await this.companyMemberRepository.save(
      this.companyMemberRepository.create(persistenceModel),
    );
    return CompanyMemberMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
    companyId,
  }: {
    paginationOptions: IPaginationOptions;
    companyId?: Company['id'];
  }): Promise<CompanyMember[]> {
    const entities = await this.companyMemberRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: companyId ? { company: { id: companyId } } : undefined,
    });

    return entities.map((entity) => CompanyMemberMapper.toDomain(entity));
  }

  async findById(
    id: CompanyMember['id'],
  ): Promise<NullableType<CompanyMember>> {
    const entity = await this.companyMemberRepository.findOne({
      where: { id },
    });

    return entity ? CompanyMemberMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: User['id']): Promise<NullableType<CompanyMember>> {
    const entity = await this.companyMemberRepository.findOne({
      where: { user: { id: Number(userId) } },
    });

    return entity ? CompanyMemberMapper.toDomain(entity) : null;
  }

  async findByIds(ids: CompanyMember['id'][]): Promise<CompanyMember[]> {
    const entities = await this.companyMemberRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CompanyMemberMapper.toDomain(entity));
  }

  async update(
    id: CompanyMember['id'],
    payload: Partial<CompanyMember>,
  ): Promise<CompanyMember> {
    const entity = await this.companyMemberRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.companyMemberRepository.save(
      this.companyMemberRepository.create(
        CompanyMemberMapper.toPersistence({
          ...CompanyMemberMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return CompanyMemberMapper.toDomain(updatedEntity);
  }

  async remove(id: CompanyMember['id']): Promise<void> {
    await this.companyMemberRepository.delete(id);
  }
}
