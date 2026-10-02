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
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';

@ApiTags('Resources')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
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
  create(@Body() createResourceDto: CreateResourceDto) {
    return this.resourcesService.create(createResourceDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Resource),
  })
  async findAll(
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
  findById(@Param('id') id: string) {
    return this.resourcesService.findById(id);
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
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(id, updateResourceDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
