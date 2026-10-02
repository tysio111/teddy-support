import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { CompaniesService } from '../companies/companies.service';
import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCompanyMemberDto } from './dto/create-company-member.dto';
import { UpdateCompanyMemberDto } from './dto/update-company-member.dto';
import { CompanyMemberRepository } from './infrastructure/persistence/company-member.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CompanyMember } from './domain/company-member';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';

@Injectable()
export class CompanyMembersService {
  constructor(
    private readonly userService: UsersService,

    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly companyMemberRepository: CompanyMemberRepository,
  ) {}

  async create(
    currentUser: JwtPayloadType,
    createCompanyMemberDto: CreateCompanyMemberDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    const userObject = await this.userService.findById(
      createCompanyMemberDto.user.id,
    );
    if (!userObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'notExists',
        },
      });
    }
    const user = userObject;

    const existingMembership = await this.companyMemberRepository.findByUserId(
      user.id,
    );
    if (existingMembership) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userAlreadyBelongsToCompany',
        },
      });
    }

    // The company is always the caller's own — the client-supplied
    // `company` field is ignored so nobody can invite a user into a
    // company they don't belong to.
    const companyId = currentUser.companyId;
    if (!companyId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }

    const companyObject = await this.companyService.findById(
      companyId,
      currentUser,
    );
    if (!companyObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }
    const company = companyObject;

    return this.companyMemberRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      status: createCompanyMemberDto.status,

      role: createCompanyMemberDto.role,

      user,

      company,
    });
  }

  findAllWithPagination({
    paginationOptions,
    currentUser,
  }: {
    paginationOptions: IPaginationOptions;
    currentUser: JwtPayloadType;
  }) {
    return this.companyMemberRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      companyId: isPlatformAdmin(currentUser)
        ? undefined
        : (currentUser.companyId ?? undefined),
    });
  }

  async findById(id: CompanyMember['id'], currentUser: JwtPayloadType) {
    const member = await this.companyMemberRepository.findById(id);

    if (
      member &&
      !isPlatformAdmin(currentUser) &&
      String(member.company?.id) !== String(currentUser.companyId)
    ) {
      throw new NotFoundException();
    }

    return member;
  }

  findByUserId(userId: User['id']) {
    return this.companyMemberRepository.findByUserId(userId);
  }

  findByIds(ids: CompanyMember['id'][]) {
    return this.companyMemberRepository.findByIds(ids);
  }

  async update(
    id: CompanyMember['id'],
    currentUser: JwtPayloadType,
    updateCompanyMemberDto: UpdateCompanyMemberDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    await this.findById(id, currentUser); // throws NotFoundException if foreign

    let user: User | undefined = undefined;

    if (updateCompanyMemberDto.user) {
      const userObject = await this.userService.findById(
        updateCompanyMemberDto.user.id,
      );
      if (!userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            user: 'notExists',
          },
        });
      }
      user = userObject;
    }

    // `company` can never be reassigned via update — membership always
    // stays with the company it was created under.
    return this.companyMemberRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      status: updateCompanyMemberDto.status,

      role: updateCompanyMemberDto.role,

      user,
    });
  }

  async remove(id: CompanyMember['id'], currentUser: JwtPayloadType) {
    await this.findById(id, currentUser); // throws NotFoundException if foreign

    return this.companyMemberRepository.remove(id);
  }
}
