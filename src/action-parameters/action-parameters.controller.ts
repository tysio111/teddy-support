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
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyMembershipGuard } from '../company-roles/company-membership.guard';

@ApiTags('Actionparameters')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), CompanyMembershipGuard)
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
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createActionParameterDto: CreateActionParameterDto,
  ) {
    return this.actionParametersService.create(user, createActionParameterDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(ActionParameter),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
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
    type: ActionParameter,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.actionParametersService.findById(id, user);
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
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateActionParameterDto: UpdateActionParameterDto,
  ) {
    return this.actionParametersService.update(
      id,
      user,
      updateActionParameterDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.actionParametersService.remove(id, user);
  }
}
