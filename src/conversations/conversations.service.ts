import { ClientsService } from '../clients/clients.service';
import { Client } from '../clients/domain/client';

import { CompaniesService } from '../companies/companies.service';
import { Company } from '../companies/domain/company';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationRepository } from './infrastructure/persistence/conversation.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Conversation } from './domain/conversation';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly clientService: ClientsService,

    private readonly companyService: CompaniesService,

    // Dependencies here
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async create(createConversationDto: CreateConversationDto) {
    // Do not remove comment below.
    // <creating-property />

    let client: Client | null | undefined = undefined;

    if (createConversationDto.client) {
      const clientObject = await this.clientService.findById(
        createConversationDto.client.id,
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

    const companyObject = await this.companyService.findById(
      createConversationDto.company.id,
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
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.conversationRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Conversation['id']) {
    return this.conversationRepository.findById(id);
  }

  findByIds(ids: Conversation['id'][]) {
    return this.conversationRepository.findByIds(ids);
  }

  async update(
    id: Conversation['id'],

    updateConversationDto: UpdateConversationDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let client: Client | null | undefined = undefined;

    if (updateConversationDto.client) {
      const clientObject = await this.clientService.findById(
        updateConversationDto.client.id,
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

    let company: Company | undefined = undefined;

    if (updateConversationDto.company) {
      const companyObject = await this.companyService.findById(
        updateConversationDto.company.id,
      );
      if (!companyObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            company: 'notExists',
          },
        });
      }
      company = companyObject;
    }

    return this.conversationRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      lastMessageAt: updateConversationDto.lastMessageAt,

      status: updateConversationDto.status,

      channel: updateConversationDto.channel,

      client,

      company,
    });
  }

  remove(id: Conversation['id']) {
    return this.conversationRepository.remove(id);
  }
}
