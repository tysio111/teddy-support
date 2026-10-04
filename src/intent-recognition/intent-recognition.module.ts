import { Module, OnModuleDestroy } from '@nestjs/common';
import { ActionExecutionsModule } from '../action-executions/action-executions.module';
import { ActionParametersModule } from '../action-parameters/action-parameters.module';
import { ActionsModule } from '../actions/actions.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { DetectedIntentsModule } from '../detected-intents/detected-intents.module';
import { HandoffsModule } from '../handoffs/handoffs.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { MessagesModule } from '../messages/messages.module';
import { IntentGraphService } from './graph/intent-graph.service';
import { IntentRecognitionController } from './intent-recognition.controller';
import { IntentRecognitionListener } from './intent-recognition.listener';
import { intentGraphServiceProvider } from './intent-recognition.provider';

@Module({
  imports: [
    MessagesModule,
    ConversationsModule,
    ActionsModule,
    ActionParametersModule,
    DetectedIntentsModule,
    ActionExecutionsModule,
    KnowledgeModule,
    HandoffsModule,
  ],
  controllers: [IntentRecognitionController],
  providers: [intentGraphServiceProvider, IntentRecognitionListener],
  exports: [IntentGraphService],
})
export class IntentRecognitionModule implements OnModuleDestroy {
  constructor(private readonly intentGraphService: IntentGraphService) {}

  onModuleDestroy(): Promise<void> {
    return this.intentGraphService.close();
  }
}
