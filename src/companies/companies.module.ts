import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { RelationalCompanyPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { RelationalCompanyMemberPersistenceModule } from '../company-members/infrastructure/persistence/relational/relational-persistence.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    // Only the persistence submodule is imported here (not the full
    // CompanyMembersModule) to avoid a module cycle: CompanyMembersModule
    // already imports CompaniesModule.
    RelationalCompanyMemberPersistenceModule,

    // do not remove this comment
    RelationalCompanyPersistenceModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService, RelationalCompanyPersistenceModule],
})
export class CompaniesModule {}
