import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CompanyMembersService } from './company-members.service';
import { CreateCompanyMemberDto } from './dto/create-company-member.dto';
import { UpdateCompanyMemberDto } from './dto/update-company-member.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyMember } from './domain/company-member';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCompanyMembersDto } from './dto/find-all-company-members.dto';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyRoles } from '../company-roles/company-roles.decorator';
import { CompanyRolesGuard } from '../company-roles/company-roles.guard';
import { CompanyMembershipGuard } from '../company-roles/company-membership.guard';

@ApiTags('Companymembers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), CompanyMembershipGuard)
@Controller({
  path: 'company-members',
  version: '1',
})
export class CompanyMembersController {
  constructor(private readonly companyMembersService: CompanyMembersService) {}

  @Post()
  @CompanyRoles('owner', 'admin')
  @UseGuards(CompanyRolesGuard)
  @ApiCreatedResponse({
    type: CompanyMember,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createCompanyMemberDto: CreateCompanyMemberDto,
  ) {
    return this.companyMembersService.create(user, createCompanyMemberDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CompanyMember),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
    @Query() query: FindAllCompanyMembersDto,
  ): Promise<InfinityPaginationResponseDto<CompanyMember>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.companyMembersService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
        currentUser: user,
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CompanyMember,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.companyMembersService.findById(id, user);
  }

  @Patch(':id')
  @CompanyRoles('owner', 'admin')
  @UseGuards(CompanyRolesGuard)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CompanyMember,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateCompanyMemberDto: UpdateCompanyMemberDto,
  ) {
    return this.companyMembersService.update(id, user, updateCompanyMemberDto);
  }

  @Delete(':id')
  @CompanyRoles('owner', 'admin')
  @UseGuards(CompanyRolesGuard)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.companyMembersService.remove(id, user);
  }
}
