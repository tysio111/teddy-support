import { Action } from '../../../../domain/action';

import { CompanyMapper } from '../../../../../companies/infrastructure/persistence/relational/mappers/company.mapper';

import { ActionEntity } from '../entities/action.entity';

export class ActionMapper {
  static toDomain(raw: ActionEntity): Action {
    const domainEntity = new Action();
    domainEntity.requiresConfirmation = raw.requiresConfirmation;

    domainEntity.status = raw.status;

    domainEntity.confidenceThreshold = raw.confidenceThreshold;

    domainEntity.authCredential = raw.authCredential;

    domainEntity.authType = raw.authType;

    domainEntity.httpMethod = raw.httpMethod;

    domainEntity.endpointUrl = raw.endpointUrl;

    domainEntity.description = raw.description;

    domainEntity.name = raw.name;

    if (raw.company) {
      domainEntity.company = CompanyMapper.toDomain(raw.company);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Action): ActionEntity {
    const persistenceEntity = new ActionEntity();
    persistenceEntity.requiresConfirmation = domainEntity.requiresConfirmation;

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.confidenceThreshold = domainEntity.confidenceThreshold;

    persistenceEntity.authCredential = domainEntity.authCredential;

    persistenceEntity.authType = domainEntity.authType;

    persistenceEntity.httpMethod = domainEntity.httpMethod;

    persistenceEntity.endpointUrl = domainEntity.endpointUrl;

    persistenceEntity.description = domainEntity.description;

    persistenceEntity.name = domainEntity.name;

    if (domainEntity.company) {
      persistenceEntity.company = CompanyMapper.toPersistence(
        domainEntity.company,
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
