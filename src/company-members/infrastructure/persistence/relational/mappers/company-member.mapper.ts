import { CompanyMember } from '../../../../domain/company-member';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { CompanyMapper } from '../../../../../companies/infrastructure/persistence/relational/mappers/company.mapper';

import { CompanyMemberEntity } from '../entities/company-member.entity';

export class CompanyMemberMapper {
  static toDomain(raw: CompanyMemberEntity): CompanyMember {
    const domainEntity = new CompanyMember();
    domainEntity.status = raw.status;

    domainEntity.role = raw.role;

    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }

    if (raw.company) {
      domainEntity.company = CompanyMapper.toDomain(raw.company);
    }

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: CompanyMember): CompanyMemberEntity {
    const persistenceEntity = new CompanyMemberEntity();
    persistenceEntity.status = domainEntity.status;

    persistenceEntity.role = domainEntity.role;

    if (domainEntity.user) {
      persistenceEntity.user = UserMapper.toPersistence(domainEntity.user);
    }

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
