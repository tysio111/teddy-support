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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Company } from './domain/company';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCompaniesDto } from './dto/find-all-companies.dto';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyRoles } from '../company-roles/company-roles.decorator';
import { CompanyRolesGuard } from '../company-roles/company-roles.guard';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'companies',
  version: '1',
})
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiCreatedResponse({
    type: Company,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createCompanyDto: CreateCompanyDto,
  ) {
    return this.companiesService.create(user, createCompanyDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Company),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
    @Query() query: FindAllCompaniesDto,
  ): Promise<InfinityPaginationResponseDto<Company>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.companiesService.findAllWithPagination({
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
    type: Company,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.companiesService.findById(id, user);
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
    type: Company,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(id, user, updateCompanyDto);
  }

  @Delete(':id')
  @CompanyRoles('owner')
  @UseGuards(CompanyRolesGuard)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.companiesService.remove(id, user);
  }
}
