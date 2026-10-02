import { Client } from '../../../../domain/client';

import { CompanyMapper } from '../../../../../companies/infrastructure/persistence/relational/mappers/company.mapper';

import { ClientEntity } from '../entities/client.entity';

export class ClientMapper {
  static toDomain(raw: ClientEntity): Client {
    const domainEntity = new Client();
    domainEntity.email = raw.email;

    domainEntity.name = raw.name;

    domainEntity.externalReference = raw.externalReference;

    if (raw.company) {
      domainEntity.company = CompanyMapper.toDomain(raw.company);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Client): ClientEntity {
    const persistenceEntity = new ClientEntity();
    persistenceEntity.email = domainEntity.email;

    persistenceEntity.name = domainEntity.name;

    persistenceEntity.externalReference = domainEntity.externalReference;

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
