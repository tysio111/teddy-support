import { Conversation } from '../../../../domain/conversation';

import { ClientMapper } from '../../../../../clients/infrastructure/persistence/relational/mappers/client.mapper';

import { ConversationEntity } from '../entities/conversation.entity';

export class ConversationMapper {
  static toDomain(raw: ConversationEntity): Conversation {
    const domainEntity = new Conversation();
    domainEntity.lastMessageAt = raw.lastMessageAt;

    domainEntity.status = raw.status;

    domainEntity.channel = raw.channel;

    if (raw.client) {
      domainEntity.client = ClientMapper.toDomain(raw.client);
    } else if (raw.client === null) {
      domainEntity.client = null;
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Conversation): ConversationEntity {
    const persistenceEntity = new ConversationEntity();
    persistenceEntity.lastMessageAt = domainEntity.lastMessageAt;

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.channel = domainEntity.channel;

    if (domainEntity.client) {
      persistenceEntity.client = ClientMapper.toPersistence(
        domainEntity.client,
      );
    } else if (domainEntity.client === null) {
      persistenceEntity.client = null;
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
