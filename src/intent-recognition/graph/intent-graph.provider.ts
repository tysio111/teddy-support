import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { AllConfigType } from '../../config/config.type';
import { ActionsService } from '../../actions/actions.service';
import { ActionParametersService } from '../../action-parameters/action-parameters.service';
import { ActionExecutionsService } from '../../action-executions/action-executions.service';
import { DetectedIntentsService } from '../../detected-intents/detected-intents.service';
import { MessagesService } from '../../messages/messages.service';
import { ActionExecutorService } from '../execution/action-executor.service';
import { CircuitBreakerService } from '../execution/circuit-breaker.service';
import { IntentLlmService } from '../llm/intent-llm.service';
import { INTENT_CHECKPOINTER } from './checkpointer.provider';
import { buildIntentGraph, IntentGraph } from './intent-graph';

export const INTENT_GRAPH = Symbol('INTENT_GRAPH');

export const intentGraphProvider: Provider<IntentGraph> = {
  provide: INTENT_GRAPH,
  inject: [
    ConfigService,
    INTENT_CHECKPOINTER,
    MessagesService,
    ActionsService,
    ActionParametersService,
    DetectedIntentsService,
    ActionExecutionsService,
    IntentLlmService,
    ActionExecutorService,
    CircuitBreakerService,
  ],
  useFactory: (
    configService: ConfigService<AllConfigType>,
    checkpointer: BaseCheckpointSaver,
    messagesService: MessagesService,
    actionsService: ActionsService,
    actionParametersService: ActionParametersService,
    detectedIntentsService: DetectedIntentsService,
    actionExecutionsService: ActionExecutionsService,
    intentLlmService: IntentLlmService,
    actionExecutorService: ActionExecutorService,
    circuitBreakerService: CircuitBreakerService,
  ) =>
    buildIntentGraph({
      config: configService.getOrThrow('intentRecognition', { infer: true }),
      logger: new Logger('IntentGraph'),
      checkpointer,
      messagesService,
      actionsService,
      actionParametersService,
      detectedIntentsService,
      actionExecutionsService,
      intentLlmService,
      actionExecutorService,
      circuitBreakerService,
    }),
};
