import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { RelationalClientPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalClientPersistenceModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService, RelationalClientPersistenceModule],
})
export class ClientsModule {}
