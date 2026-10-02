import { ClientsModule } from '../clients/clients.module';
import { CompaniesModule } from '../companies/companies.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { RelationalConversationPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ClientsModule,

    CompaniesModule,

    // do not remove this comment
    RelationalConversationPersistenceModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService, RelationalConversationPersistenceModule],
})
export class ConversationsModule {}
