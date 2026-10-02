import { CompaniesModule } from '../companies/companies.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ActionsService } from './actions.service';
import { ActionsController } from './actions.controller';
import { RelationalActionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CompaniesModule,

    // do not remove this comment
    RelationalActionPersistenceModule,
  ],
  controllers: [ActionsController],
  providers: [ActionsService],
  exports: [ActionsService, RelationalActionPersistenceModule],
})
export class ActionsModule {}
