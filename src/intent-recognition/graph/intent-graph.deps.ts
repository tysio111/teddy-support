import { Logger } from '@nestjs/common';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { ActionsService } from '../../actions/actions.service';
import { ActionParametersService } from '../../action-parameters/action-parameters.service';
import { ActionExecutionsService } from '../../action-executions/action-executions.service';
import { DetectedIntentsService } from '../../detected-intents/detected-intents.service';
import { MessagesService } from '../../messages/messages.service';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';
import { ActionExecutorService } from '../execution/action-executor.service';
import { CircuitBreakerService } from '../execution/circuit-breaker.service';
import { IntentLlmService } from '../llm/intent-llm.service';

// Everything the graph's nodes need from the outside world. Wired up in
// intent-recognition.provider.ts; tests pass plain mocks.
export type IntentGraphDeps = {
  config: IntentRecognitionConfig;
  logger: Logger;
  checkpointer: BaseCheckpointSaver;
  messagesService: MessagesService;
  actionsService: ActionsService;
  actionParametersService: ActionParametersService;
  detectedIntentsService: DetectedIntentsService;
  actionExecutionsService: ActionExecutionsService;
  intentLlmService: IntentLlmService;
  actionExecutorService: ActionExecutorService;
  circuitBreakerService: CircuitBreakerService;
};
