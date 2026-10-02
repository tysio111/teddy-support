import { DetectedIntent } from '../../../../domain/detected-intent';

import { ActionMapper } from '../../../../../actions/infrastructure/persistence/relational/mappers/action.mapper';

import { MessageMapper } from '../../../../../messages/infrastructure/persistence/relational/mappers/message.mapper';

import { DetectedIntentEntity } from '../entities/detected-intent.entity';

export class DetectedIntentMapper {
  static toDomain(raw: DetectedIntentEntity): DetectedIntent {
    const domainEntity = new DetectedIntent();
    domainEntity.extractedParameters = raw.extractedParameters;

    domainEntity.status = raw.status;

    domainEntity.rank = raw.rank;

    domainEntity.confidenceScore = raw.confidenceScore;

    if (raw.action) {
      domainEntity.action = ActionMapper.toDomain(raw.action);
    } else if (raw.action === null) {
      domainEntity.action = null;
    }

    if (raw.message) {
      domainEntity.message = MessageMapper.toDomain(raw.message);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: DetectedIntent): DetectedIntentEntity {
    const persistenceEntity = new DetectedIntentEntity();
    persistenceEntity.extractedParameters = domainEntity.extractedParameters;

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.rank = domainEntity.rank;

    persistenceEntity.confidenceScore = domainEntity.confidenceScore;

    if (domainEntity.action) {
      persistenceEntity.action = ActionMapper.toPersistence(
        domainEntity.action,
      );
    } else if (domainEntity.action === null) {
      persistenceEntity.action = null;
    }

    if (domainEntity.message) {
      persistenceEntity.message = MessageMapper.toPersistence(
        domainEntity.message,
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
