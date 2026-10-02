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

@ApiTags('Companymembers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'company-members',
  version: '1',
})
export class CompanyMembersController {
  constructor(private readonly companyMembersService: CompanyMembersService) {}

  @Post()
  @ApiCreatedResponse({
    type: CompanyMember,
  })
  create(@Body() createCompanyMemberDto: CreateCompanyMemberDto) {
    return this.companyMembersService.create(createCompanyMemberDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CompanyMember),
  })
  async findAll(
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
  findById(@Param('id') id: string) {
    return this.companyMembersService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CompanyMember,
  })
  update(
    @Param('id') id: string,
    @Body() updateCompanyMemberDto: UpdateCompanyMemberDto,
  ) {
    return this.companyMembersService.update(id, updateCompanyMemberDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.companyMembersService.remove(id);
  }
}
