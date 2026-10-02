import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { RelationalCompanyPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalCompanyPersistenceModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService, RelationalCompanyPersistenceModule],
})
export class CompaniesModule {}
