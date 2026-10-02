import { Company } from '../../../../domain/company';

import { CompanyEntity } from '../entities/company.entity';

export class CompanyMapper {
  static toDomain(raw: CompanyEntity): Company {
    const domainEntity = new Company();
    domainEntity.apiKey = raw.apiKey;

    domainEntity.confidenceThreshold = raw.confidenceThreshold;

    domainEntity.status = raw.status;

    domainEntity.slug = raw.slug;

    domainEntity.name = raw.name;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Company): CompanyEntity {
    const persistenceEntity = new CompanyEntity();
    persistenceEntity.apiKey = domainEntity.apiKey;

    persistenceEntity.confidenceThreshold = domainEntity.confidenceThreshold;

    persistenceEntity.status = domainEntity.status;

    persistenceEntity.slug = domainEntity.slug;

    persistenceEntity.name = domainEntity.name;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
