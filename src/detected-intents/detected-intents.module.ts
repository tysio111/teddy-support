import { ActionsModule } from '../actions/actions.module';
import { MessagesModule } from '../messages/messages.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { DetectedIntentsService } from './detected-intents.service';
import { DetectedIntentsController } from './detected-intents.controller';
import { RelationalDetectedIntentPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ActionsModule,

    MessagesModule,

    // do not remove this comment
    RelationalDetectedIntentPersistenceModule,
  ],
  controllers: [DetectedIntentsController],
  providers: [DetectedIntentsService],
  exports: [DetectedIntentsService, RelationalDetectedIntentPersistenceModule],
})
export class DetectedIntentsModule {}
