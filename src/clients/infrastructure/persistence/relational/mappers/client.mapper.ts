import { Client } from '../../../../domain/client';

import { ClientEntity } from '../entities/client.entity';

export class ClientMapper {
  static toDomain(raw: ClientEntity): Client {
    const domainEntity = new Client();
    domainEntity.email = raw.email;

    domainEntity.name = raw.name;

    domainEntity.externalReference = raw.externalReference;

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

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
