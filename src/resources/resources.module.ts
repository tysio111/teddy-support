import { FilesModule } from '../files/files.module';
import { CompaniesModule } from '../companies/companies.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { RelationalResourcePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    FilesModule,

    CompaniesModule,

    // do not remove this comment
    RelationalResourcePersistenceModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService, RelationalResourcePersistenceModule],
})
export class ResourcesModule {}
