import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyRepository } from './infrastructure/persistence/company.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Company } from './domain/company';
import { CompanyMemberRepository } from '../company-members/infrastructure/persistence/company-member.repository';
import { UsersService } from '../users/users.service';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';

@Injectable()
export class CompaniesService {
  constructor(
    // Dependencies here
    private readonly companyRepository: CompanyRepository,
    private readonly companyMemberRepository: CompanyMemberRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(
    currentUser: JwtPayloadType,
    createCompanyDto: CreateCompanyDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    const isAdmin = isPlatformAdmin(currentUser);

    if (!isAdmin && currentUser.companyId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'userAlreadyBelongsToCompany',
        },
      });
    }

    const company = await this.companyRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      apiKey: createCompanyDto.apiKey,

      confidenceThreshold: createCompanyDto.confidenceThreshold,

      status: createCompanyDto.status,

      slug: createCompanyDto.slug,

      name: createCompanyDto.name,
    });

    if (!isAdmin) {
      const user = await this.usersService.findById(currentUser.id);

      if (user) {
        await this.companyMemberRepository.create({
          user,
          company,
          role: 'owner',
          status: 'active',
        });
      }
    }

    return company;
  }

  private assertOwnCompany(id: Company['id'], currentUser: JwtPayloadType) {
    if (
      !isPlatformAdmin(currentUser) &&
      String(currentUser.companyId) !== String(id)
    ) {
      throw new NotFoundException();
    }
  }

  async findAllWithPagination({
    paginationOptions,
    currentUser,
  }: {
    paginationOptions: IPaginationOptions;
    currentUser: JwtPayloadType;
  }) {
    if (!isPlatformAdmin(currentUser)) {
      if (!currentUser.companyId) {
        return [];
      }

      const company = await this.companyRepository.findById(
        currentUser.companyId,
      );

      return company ? [company] : [];
    }

    return this.companyRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Company['id'], currentUser: JwtPayloadType) {
    this.assertOwnCompany(id, currentUser);

    return this.companyRepository.findById(id);
  }

  findByIds(ids: Company['id'][]) {
    return this.companyRepository.findByIds(ids);
  }

  async update(
    id: Company['id'],
    currentUser: JwtPayloadType,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    this.assertOwnCompany(id, currentUser);

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

  remove(id: Company['id'], currentUser: JwtPayloadType) {
    this.assertOwnCompany(id, currentUser);

    return this.companyRepository.remove(id);
  }
}
