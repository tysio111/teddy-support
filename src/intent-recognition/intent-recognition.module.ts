import { Module } from '@nestjs/common';
import { ActionExecutionsModule } from '../action-executions/action-executions.module';
import { ActionParametersModule } from '../action-parameters/action-parameters.module';
import { ActionsModule } from '../actions/actions.module';
import { DetectedIntentsModule } from '../detected-intents/detected-intents.module';
import { MessagesModule } from '../messages/messages.module';
import { ActionExecutorService } from './execution/action-executor.service';
import { IntentGraphService } from './graph/intent-graph.service';
import { IntentRecognitionListener } from './intent-recognition.listener';
import { chatModelProvider } from './llm/chat-model.provider';
import { IntentLlmService } from './llm/intent-llm.service';

@Module({
  imports: [
    MessagesModule,
    ActionsModule,
    ActionParametersModule,
    DetectedIntentsModule,
    ActionExecutionsModule,
  ],
  providers: [
    chatModelProvider,
    IntentLlmService,
    ActionExecutorService,
    IntentGraphService,
    IntentRecognitionListener,
  ],
})
export class IntentRecognitionModule {}
