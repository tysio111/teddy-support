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
import { ActionParametersService } from './action-parameters.service';
import { CreateActionParameterDto } from './dto/create-action-parameter.dto';
import { UpdateActionParameterDto } from './dto/update-action-parameter.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ActionParameter } from './domain/action-parameter';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllActionParametersDto } from './dto/find-all-action-parameters.dto';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';

@ApiTags('Actionparameters')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'action-parameters',
  version: '1',
})
export class ActionParametersController {
  constructor(
    private readonly actionParametersService: ActionParametersService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: ActionParameter,
  })
  create(@Body() createActionParameterDto: CreateActionParameterDto) {
    return this.actionParametersService.create(createActionParameterDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(ActionParameter),
  })
  async findAll(
    @Query() query: FindAllActionParametersDto,
  ): Promise<InfinityPaginationResponseDto<ActionParameter>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.actionParametersService.findAllWithPagination({
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
    type: ActionParameter,
  })
  findById(@Param('id') id: string) {
    return this.actionParametersService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: ActionParameter,
  })
  update(
    @Param('id') id: string,
    @Body() updateActionParameterDto: UpdateActionParameterDto,
  ) {
    return this.actionParametersService.update(id, updateActionParameterDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.actionParametersService.remove(id);
  }
}
