import { Resource } from '../../../../domain/resource';

import { FileMapper } from '../../../../../files/infrastructure/persistence/relational/mappers/file.mapper';

import { CompanyMapper } from '../../../../../companies/infrastructure/persistence/relational/mappers/company.mapper';

import { ResourceEntity } from '../entities/resource.entity';

export class ResourceMapper {
  static toDomain(raw: ResourceEntity): Resource {
    const domainEntity = new Resource();
    domainEntity.vectorRef = raw.vectorRef;

    domainEntity.status = raw.status;

    domainEntity.sourceUrl = raw.sourceUrl;

    if (raw.file) {
      domainEntity.file = FileMapper.toDomain(raw.file);
    } else if (raw.file === null) {
      domainEntity.file = null;
    }

    domainEntity.type = raw.type;

    domainEntity.title = raw.title;

    if (raw.company) {
      domainEntity.company = CompanyMapper.toDomain(raw.company);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Resource): ResourceEntity {
    const persistenceEntity = new ResourceEntity();
    persistenceEntity.vectorRef = domainEntity.vectorRef;

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.sourceUrl = domainEntity.sourceUrl;

    if (domainEntity.file) {
      persistenceEntity.file = FileMapper.toPersistence(domainEntity.file);
    } else if (domainEntity.file === null) {
      persistenceEntity.file = null;
    }

    persistenceEntity.type = domainEntity.type;

    persistenceEntity.title = domainEntity.title;

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
