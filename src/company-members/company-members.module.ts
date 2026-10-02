import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CompanyMembersService } from './company-members.service';
import { CompanyMembersController } from './company-members.controller';
import { RelationalCompanyMemberPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    CompaniesModule,

    // do not remove this comment
    RelationalCompanyMemberPersistenceModule,
  ],
  controllers: [CompanyMembersController],
  providers: [CompanyMembersService],
  exports: [CompanyMembersService, RelationalCompanyMemberPersistenceModule],
})
export class CompanyMembersModule {}
