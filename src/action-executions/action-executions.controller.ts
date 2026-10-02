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
import { ActionExecutionsService } from './action-executions.service';
import { CreateActionExecutionDto } from './dto/create-action-execution.dto';
import { UpdateActionExecutionDto } from './dto/update-action-execution.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ActionExecution } from './domain/action-execution';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllActionExecutionsDto } from './dto/find-all-action-executions.dto';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

@ApiTags('Actionexecutions')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'action-executions',
  version: '1',
})
export class ActionExecutionsController {
  constructor(
    private readonly actionExecutionsService: ActionExecutionsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: ActionExecution,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createActionExecutionDto: CreateActionExecutionDto,
  ) {
    return this.actionExecutionsService.create(user, createActionExecutionDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(ActionExecution),
  })
  async findAll(
    @Query() query: FindAllActionExecutionsDto,
  ): Promise<InfinityPaginationResponseDto<ActionExecution>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.actionExecutionsService.findAllWithPagination({
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
    type: ActionExecution,
  })
  findById(@Param('id') id: string) {
    return this.actionExecutionsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: ActionExecution,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateActionExecutionDto: UpdateActionExecutionDto,
  ) {
    return this.actionExecutionsService.update(
      id,
      user,
      updateActionExecutionDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.actionExecutionsService.remove(id);
  }
}
