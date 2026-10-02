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
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Action } from './domain/action';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllActionsDto } from './dto/find-all-actions.dto';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyMembershipGuard } from '../company-roles/company-membership.guard';

@ApiTags('Actions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), CompanyMembershipGuard)
@Controller({
  path: 'actions',
  version: '1',
})
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Post()
  @ApiCreatedResponse({
    type: Action,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createActionDto: CreateActionDto,
  ) {
    return this.actionsService.create(user, createActionDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Action),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
    @Query() query: FindAllActionsDto,
  ): Promise<InfinityPaginationResponseDto<Action>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.actionsService.findAllWithPagination({
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
    type: Action,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.actionsService.findById(id, user);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Action,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateActionDto: UpdateActionDto,
  ) {
    return this.actionsService.update(id, user, updateActionDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.actionsService.remove(id, user);
  }
}
