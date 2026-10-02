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
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Conversation } from './domain/conversation';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllConversationsDto } from './dto/find-all-conversations.dto';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyMembershipGuard } from '../company-roles/company-membership.guard';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), CompanyMembershipGuard)
@Controller({
  path: 'conversations',
  version: '1',
})
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiCreatedResponse({
    type: Conversation,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.conversationsService.create(user, createConversationDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Conversation),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
    @Query() query: FindAllConversationsDto,
  ): Promise<InfinityPaginationResponseDto<Conversation>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.conversationsService.findAllWithPagination({
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
    type: Conversation,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.conversationsService.findById(id, user);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Conversation,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(id, user, updateConversationDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.conversationsService.remove(id, user);
  }
}
