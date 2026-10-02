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
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Resource } from './domain/resource';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllResourcesDto } from './dto/find-all-resources.dto';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyMembershipGuard } from '../company-roles/company-membership.guard';

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), CompanyMembershipGuard)
@Controller({
  path: 'resources',
  version: '1',
})
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @ApiCreatedResponse({
    type: Resource,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createResourceDto: CreateResourceDto,
  ) {
    return this.resourcesService.create(user, createResourceDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Resource),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
    @Query() query: FindAllResourcesDto,
  ): Promise<InfinityPaginationResponseDto<Resource>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.resourcesService.findAllWithPagination({
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
    type: Resource,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.resourcesService.findById(id, user);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Resource,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(id, user, updateResourceDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.resourcesService.remove(id, user);
  }
}
