import { Module, OnModuleDestroy } from '@nestjs/common';
import { ActionExecutionsModule } from '../action-executions/action-executions.module';
import { ActionParametersModule } from '../action-parameters/action-parameters.module';
import { ActionsModule } from '../actions/actions.module';
import { DetectedIntentsModule } from '../detected-intents/detected-intents.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MessagesModule } from '../messages/messages.module';
import { IntentGraphService } from './graph/intent-graph.service';
import { IntentRecognitionController } from './intent-recognition.controller';
import { IntentRecognitionListener } from './intent-recognition.listener';
import { intentGraphServiceProvider } from './intent-recognition.provider';

@Module({
  imports: [
    MessagesModule,
    ActionsModule,
    ActionParametersModule,
    DetectedIntentsModule,
    ActionExecutionsModule,
    KnowledgeModule,
  ],
  controllers: [IntentRecognitionController],
  providers: [intentGraphServiceProvider, IntentRecognitionListener],
})
export class IntentRecognitionModule implements OnModuleDestroy {
  constructor(private readonly intentGraphService: IntentGraphService) {}

  onModuleDestroy(): Promise<void> {
    return this.intentGraphService.close();
  }
}
