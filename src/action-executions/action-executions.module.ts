import { ActionsModule } from '../actions/actions.module';
import { DetectedIntentsModule } from '../detected-intents/detected-intents.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ActionExecutionsService } from './action-executions.service';
import { ActionExecutionsController } from './action-executions.controller';
import { RelationalActionExecutionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ActionsModule,

    DetectedIntentsModule,

    // do not remove this comment
    RelationalActionExecutionPersistenceModule,
  ],
  controllers: [ActionExecutionsController],
  providers: [ActionExecutionsService],
  exports: [
    ActionExecutionsService,
    RelationalActionExecutionPersistenceModule,
  ],
})
export class ActionExecutionsModule {}
