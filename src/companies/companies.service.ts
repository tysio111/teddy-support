import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyRepository } from './infrastructure/persistence/company.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Company } from './domain/company';

@Injectable()
export class CompaniesService {
  constructor(
    // Dependencies here
    private readonly companyRepository: CompanyRepository,
  ) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.companyRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      apiKey: createCompanyDto.apiKey,

      confidenceThreshold: createCompanyDto.confidenceThreshold,

      status: createCompanyDto.status,

      slug: createCompanyDto.slug,

      name: createCompanyDto.name,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.companyRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Company['id']) {
    return this.companyRepository.findById(id);
  }

  findByIds(ids: Company['id'][]) {
    return this.companyRepository.findByIds(ids);
  }

  async update(
    id: Company['id'],

    updateCompanyDto: UpdateCompanyDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.companyRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      apiKey: updateCompanyDto.apiKey,

      confidenceThreshold: updateCompanyDto.confidenceThreshold,

      status: updateCompanyDto.status,

      slug: updateCompanyDto.slug,

      name: updateCompanyDto.name,
    });
  }

  remove(id: Company['id']) {
    return this.companyRepository.remove(id);
  }
}
