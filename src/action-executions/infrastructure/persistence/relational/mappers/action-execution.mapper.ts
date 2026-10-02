import { ActionExecution } from '../../../../domain/action-execution';

import { ActionMapper } from '../../../../../actions/infrastructure/persistence/relational/mappers/action.mapper';

import { DetectedIntentMapper } from '../../../../../detected-intents/infrastructure/persistence/relational/mappers/detected-intent.mapper';

import { ActionExecutionEntity } from '../entities/action-execution.entity';

export class ActionExecutionMapper {
  static toDomain(raw: ActionExecutionEntity): ActionExecution {
    const domainEntity = new ActionExecution();
    domainEntity.executedAt = raw.executedAt;

    domainEntity.errorMessage = raw.errorMessage;

    domainEntity.responsePayload = raw.responsePayload;

    domainEntity.responseStatusCode = raw.responseStatusCode;

    domainEntity.status = raw.status;

    domainEntity.requestPayload = raw.requestPayload;

    if (raw.action) {
      domainEntity.action = ActionMapper.toDomain(raw.action);
    }

    if (raw.detectedIntent) {
      domainEntity.detectedIntent = DetectedIntentMapper.toDomain(
        raw.detectedIntent,
      );
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: ActionExecution): ActionExecutionEntity {
    const persistenceEntity = new ActionExecutionEntity();
    persistenceEntity.executedAt = domainEntity.executedAt;

    persistenceEntity.errorMessage = domainEntity.errorMessage;

    persistenceEntity.responsePayload = domainEntity.responsePayload;

    persistenceEntity.responseStatusCode = domainEntity.responseStatusCode;

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.requestPayload = domainEntity.requestPayload;

    if (domainEntity.action) {
      persistenceEntity.action = ActionMapper.toPersistence(
        domainEntity.action,
      );
    }

    if (domainEntity.detectedIntent) {
      persistenceEntity.detectedIntent = DetectedIntentMapper.toPersistence(
        domainEntity.detectedIntent,
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
