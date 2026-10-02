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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Client } from './domain/client';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllClientsDto } from './dto/find-all-clients.dto';
import { CurrentUser } from '../utils/decorators/current-user.decorator';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CompanyMembershipGuard } from '../company-roles/company-membership.guard';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), CompanyMembershipGuard)
@Controller({
  path: 'clients',
  version: '1',
})
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiCreatedResponse({
    type: Client,
  })
  create(
    @CurrentUser() user: JwtPayloadType,
    @Body() createClientDto: CreateClientDto,
  ) {
    return this.clientsService.create(user, createClientDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Client),
  })
  async findAll(
    @CurrentUser() user: JwtPayloadType,
    @Query() query: FindAllClientsDto,
  ): Promise<InfinityPaginationResponseDto<Client>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.clientsService.findAllWithPagination({
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
    type: Client,
  })
  findById(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.clientsService.findById(id, user);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Client,
  })
  update(
    @CurrentUser() user: JwtPayloadType,
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, user, updateClientDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@CurrentUser() user: JwtPayloadType, @Param('id') id: string) {
    return this.clientsService.remove(id, user);
  }
}
