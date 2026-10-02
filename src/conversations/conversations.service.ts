import { ClientsService } from '../clients/clients.service';
import { Client } from '../clients/domain/client';

import { CompaniesService } from '../companies/companies.service';

import {
  // common
  Injectable,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationRepository } from './infrastructure/persistence/conversation.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Conversation } from './domain/conversation';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { isPlatformAdmin } from '../roles/is-platform-admin.util';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly clientService: ClientsService,

    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async create(
    currentUser: JwtPayloadType,
    createConversationDto: CreateConversationDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    let client: Client | null | undefined = undefined;

    if (createConversationDto.client) {
      // findById enforces that the client belongs to the caller's company.
      const clientObject = await this.clientService.findById(
        createConversationDto.client.id,
        currentUser,
      );
      if (!clientObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            client: 'notExists',
          },
        });
      }
      client = clientObject;
    } else if (createConversationDto.client === null) {
      client = null;
    }

    // The company is always the caller's own — a client-supplied `company`
    // field, if any, is ignored.
    if (!currentUser.companyId) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }

    const companyObject = await this.companyService.findById(
      currentUser.companyId,
      currentUser,
    );
    if (!companyObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          company: 'notExists',
        },
      });
    }
    const company = companyObject;

    return this.conversationRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      lastMessageAt: createConversationDto.lastMessageAt,

      status: createConversationDto.status,

      channel: createConversationDto.channel,

      client,

      company,
    });
  }

  findAllWithPagination({
    paginationOptions,
    currentUser,
  }: {
    paginationOptions: IPaginationOptions;
    currentUser: JwtPayloadType;
  }) {
    return this.conversationRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      companyId: isPlatformAdmin(currentUser)
        ? undefined
        : (currentUser.companyId ?? undefined),
    });
  }

  async findById(id: Conversation['id'], currentUser: JwtPayloadType) {
    const conversation = await this.conversationRepository.findById(id);

    if (
      conversation &&
      !isPlatformAdmin(currentUser) &&
      String(conversation.company?.id) !== String(currentUser.companyId)
    ) {
      throw new NotFoundException();
    }

    return conversation;
  }

  findByIds(ids: Conversation['id'][]) {
    return this.conversationRepository.findByIds(ids);
  }

  async update(
    id: Conversation['id'],
    currentUser: JwtPayloadType,
    updateConversationDto: UpdateConversationDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    await this.findById(id, currentUser); // throws NotFoundException if foreign

    let client: Client | null | undefined = undefined;

    if (updateConversationDto.client) {
      // findById enforces that the client belongs to the caller's company.
      const clientObject = await this.clientService.findById(
        updateConversationDto.client.id,
        currentUser,
      );
      if (!clientObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            client: 'notExists',
          },
        });
      }
      client = clientObject;
    } else if (updateConversationDto.client === null) {
      client = null;
    }

    // A conversation can never be reassigned to a different company via
    // update.
    return this.conversationRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      lastMessageAt: updateConversationDto.lastMessageAt,

      status: updateConversationDto.status,

      channel: updateConversationDto.channel,

      client,
    });
  }

  async remove(id: Conversation['id'], currentUser: JwtPayloadType) {
    await this.findById(id, currentUser); // throws NotFoundException if foreign

    return this.conversationRepository.remove(id);
  }
}
