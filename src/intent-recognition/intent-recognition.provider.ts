import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { ActionsService } from '../actions/actions.service';
import { ActionParametersService } from '../action-parameters/action-parameters.service';
import { ActionExecutionsService } from '../action-executions/action-executions.service';
import { DetectedIntentsService } from '../detected-intents/detected-intents.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { MessagesService } from '../messages/messages.service';
import { ActionExecutorService } from './execution/action-executor.service';
import { CircuitBreakerService } from './execution/circuit-breaker.service';
import { createCheckpointer } from './graph/checkpointer';
import { buildIntentGraph } from './graph/intent-graph';
import { IntentGraphService } from './graph/intent-graph.service';
import { createChatModels } from './llm/chat-models';
import { IntentLlmService } from './llm/intent-llm.service';

// The module's composition root: Nest supplies config and the services of other
// modules, everything internal to intent recognition is wired here by hand.
export const intentGraphServiceProvider: Provider<IntentGraphService> = {
  provide: IntentGraphService,
  inject: [
    ConfigService,
    MessagesService,
    ActionsService,
    ActionParametersService,
    DetectedIntentsService,
    ActionExecutionsService,
    KnowledgeService,
  ],
  useFactory: async (
    configService: ConfigService<AllConfigType>,
    messagesService: MessagesService,
    actionsService: ActionsService,
    actionParametersService: ActionParametersService,
    detectedIntentsService: DetectedIntentsService,
    actionExecutionsService: ActionExecutionsService,
    knowledgeService: KnowledgeService,
  ) => {
    const config = configService.getOrThrow('intentRecognition', {
      infer: true,
    });
    const checkpointer = await createCheckpointer(
      config,
      configService.getOrThrow('database', { infer: true }),
    );

    const graph = buildIntentGraph({
      config,
      logger: new Logger('IntentGraph'),
      checkpointer,
      messagesService,
      actionsService,
      actionParametersService,
      detectedIntentsService,
      actionExecutionsService,
      intentLlmService: new IntentLlmService(createChatModels(config)),
      actionExecutorService: new ActionExecutorService(config),
      circuitBreakerService: new CircuitBreakerService(
        config,
        actionExecutionsService,
      ),
      knowledgeService,
    });

    return new IntentGraphService(graph, checkpointer, config);
  },
};
