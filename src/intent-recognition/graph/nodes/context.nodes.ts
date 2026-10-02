import { ActionParameter } from '../../../action-parameters/domain/action-parameter';
import { matchesInjectionPattern } from '../../prompts/guardrail.prompt';
import {
  GuardrailVerdictEnum,
  IntentOutcomeEnum,
} from '../../intent-recognition.types';
import { IntentGraphDeps } from '../intent-graph.deps';
import { IntentGraphStateType, IntentGraphUpdate } from '../intent-graph.state';

export function loadContext({
  config,
  messagesService,
  actionsService,
  actionParametersService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const message = await messagesService.findById(state.messageId);
    if (!message) {
      return { outcome: IntentOutcomeEnum.skipped };
    }

    // No early exit without actions: the message still goes through the
    // guardrail, and the knowledge base may answer it (see classifyIntent).
    const actions = await actionsService.findActive();
    const [history, parameters] = await Promise.all([
      messagesService.findRecentByConversationId(
        message.conversation.id,
        config.historyLimit,
      ),
      actions.length
        ? actionParametersService.findByActionIds(
            actions.map((action) => action.id),
          )
        : ([] as ActionParameter[]),
    ]);

    return {
      message,
      history,
      catalog: actions.map((action) => ({
        // State is checkpointed to the database: keep credentials out of it.
        // executeAction loads them just in time.
        action: { ...action, authCredential: undefined },
        parameters: parameters.filter(
          (parameter) => parameter.action?.id === action.id,
        ),
      })),
    };
  };
}

// Makes the run idempotent if the same message is processed twice (event
// redelivery, manual replay).
export function dedupe({ detectedIntentsService }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const existing = await detectedIntentsService.findByMessageId(
      state.messageId,
    );

    return existing.length ? { outcome: IntentOutcomeEnum.duplicate } : {};
  };
}

export function guardrail({
  config,
  logger,
  intentLlmService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    if (!config.guardrailEnabled) {
      return {};
    }

    const content = state.message!.content;
    const verdict = matchesInjectionPattern(content)
      ? GuardrailVerdictEnum.injection
      : await intentLlmService.screenMessage(content);

    if (verdict === GuardrailVerdictEnum.allow) {
      return {};
    }

    logger.warn(`Message ${state.messageId} blocked by guardrail: ${verdict}`);
    return { outcome: IntentOutcomeEnum.blocked };
  };
}
