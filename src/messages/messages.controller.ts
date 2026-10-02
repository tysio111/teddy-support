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
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Message } from './domain/message';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllMessagesDto } from './dto/find-all-messages.dto';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyMembershipGuard } from '../company-roles/company-membership.guard';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), CompanyMembershipGuard)
@Controller({
  path: 'messages',
  version: '1',
})
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiCreatedResponse({
    type: Message,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagesService.create(user, createMessageDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Message),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
    @Query() query: FindAllMessagesDto,
  ): Promise<InfinityPaginationResponseDto<Message>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.messagesService.findAllWithPagination({
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
    type: Message,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.messagesService.findById(id, user);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Message,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagesService.update(id, user, updateMessageDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.messagesService.remove(id, user);
  }
}
