import { Handoff } from '../../../../domain/handoff';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { ConversationMapper } from '../../../../../conversations/infrastructure/persistence/relational/mappers/conversation.mapper';

import { HandoffEntity } from '../entities/handoff.entity';

export class HandoffMapper {
  static toDomain(raw: HandoffEntity): Handoff {
    const domainEntity = new Handoff();
    domainEntity.closedAt = raw.closedAt;

    domainEntity.assignedAt = raw.assignedAt;

    if (raw.assignee) {
      domainEntity.assignee = UserMapper.toDomain(raw.assignee);
    } else if (raw.assignee === null) {
      domainEntity.assignee = null;
    }

    domainEntity.context = raw.context;

    domainEntity.summaryStatus = raw.summaryStatus;

    domainEntity.summary = raw.summary;

    domainEntity.status = raw.status;

    domainEntity.reason = raw.reason;

    if (raw.conversation) {
      domainEntity.conversation = ConversationMapper.toDomain(raw.conversation);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Handoff): HandoffEntity {
    const persistenceEntity = new HandoffEntity();
    persistenceEntity.closedAt = domainEntity.closedAt;

    persistenceEntity.assignedAt = domainEntity.assignedAt;

    if (domainEntity.assignee) {
      persistenceEntity.assignee = UserMapper.toPersistence(
        domainEntity.assignee,
      );
    } else if (domainEntity.assignee === null) {
      persistenceEntity.assignee = null;
    }

    persistenceEntity.context = domainEntity.context;

    persistenceEntity.summaryStatus = domainEntity.summaryStatus;

    persistenceEntity.summary = domainEntity.summary;

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.reason = domainEntity.reason;

    if (domainEntity.conversation) {
      persistenceEntity.conversation = ConversationMapper.toPersistence(
        domainEntity.conversation,
      );
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
