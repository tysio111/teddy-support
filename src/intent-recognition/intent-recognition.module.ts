import { Module } from '@nestjs/common';
import { ActionExecutionsModule } from '../action-executions/action-executions.module';
import { ActionParametersModule } from '../action-parameters/action-parameters.module';
import { ActionsModule } from '../actions/actions.module';
import { DetectedIntentsModule } from '../detected-intents/detected-intents.module';
import { MessagesModule } from '../messages/messages.module';
import { ActionExecutorService } from './execution/action-executor.service';
import { CircuitBreakerService } from './execution/circuit-breaker.service';
import { checkpointerProvider } from './graph/checkpointer.provider';
import { intentGraphProvider } from './graph/intent-graph.provider';
import { IntentGraphService } from './graph/intent-graph.service';
import { IntentRecognitionController } from './intent-recognition.controller';
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
  controllers: [IntentRecognitionController],
  providers: [
    chatModelProvider,
    checkpointerProvider,
    IntentLlmService,
    ActionExecutorService,
    CircuitBreakerService,
    intentGraphProvider,
    IntentGraphService,
    IntentRecognitionListener,
  ],
})
export class IntentRecognitionModule {}
