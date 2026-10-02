import { ActionParameter } from '../../../../domain/action-parameter';

import { ActionMapper } from '../../../../../actions/infrastructure/persistence/relational/mappers/action.mapper';

import { ActionParameterEntity } from '../entities/action-parameter.entity';

export class ActionParameterMapper {
  static toDomain(raw: ActionParameterEntity): ActionParameter {
    const domainEntity = new ActionParameter();
    domainEntity.order = raw.order;

    domainEntity.enumValues = raw.enumValues;

    domainEntity.isRequired = raw.isRequired;

    domainEntity.description = raw.description;

    domainEntity.type = raw.type;

    domainEntity.name = raw.name;

    if (raw.action) {
      domainEntity.action = ActionMapper.toDomain(raw.action);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: ActionParameter): ActionParameterEntity {
    const persistenceEntity = new ActionParameterEntity();
    persistenceEntity.order = domainEntity.order;

    persistenceEntity.enumValues = domainEntity.enumValues;

    persistenceEntity.isRequired = domainEntity.isRequired;

    persistenceEntity.description = domainEntity.description;

    persistenceEntity.type = domainEntity.type;

    persistenceEntity.name = domainEntity.name;

    if (domainEntity.action) {
      persistenceEntity.action = ActionMapper.toPersistence(
        domainEntity.action,
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
