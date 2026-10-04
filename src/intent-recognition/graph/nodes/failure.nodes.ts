import { ActionExecutionStatusEnum } from '../../../action-executions/action-execution-status.enum';
import { HandoffContext } from '../../../handoffs/handoffs.types';
import { DetectedIntentStatusEnum } from '../../../detected-intents/detected-intent-status.enum';
import { buildEscalationReply } from '../../prompts/bot-replies';
import { IntentOutcomeEnum } from '../../intent-recognition.types';
import { IntentGraphDeps } from '../intent-graph.deps';
import { recognitionResult } from '../intent-graph.helpers';
import { IntentGraphStateType, IntentGraphUpdate } from '../intent-graph.state';

export function handleError({
  logger,
  detectedIntentsService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const error = state.error!;
    logger.error(
      `Intent recognition failed in ${error.node} for message ${state.messageId}: ${error.message}`,
    );

    const intent = state.topIntent ?? state.intents[0];
    if (intent) {
      await detectedIntentsService.updateRecognitionResult(intent.id, {
        status: DetectedIntentStatusEnum.failed,
        ...recognitionResult(intent),
      });
    }

    return { outcome: IntentOutcomeEnum.failed };
  };
}

export function escalateToHuman({
  messagesService,
  detectedIntentsService,
  handoffsService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    if (state.message) {
      await messagesService.createBotMessage(
        state.message.conversation,
        buildEscalationReply(state.outcome),
      );
      // Pauses the bot and puts the conversation in the agent inbox.
      await handoffsService.open(state.message.conversation, {
        reason: state.outcome ?? IntentOutcomeEnum.failed,
        context: buildHandoffContext(state),
      });
    }

    const intent = state.topIntent ?? state.intents[0];
    if (intent && state.outcome !== IntentOutcomeEnum.failed) {
      await detectedIntentsService.updateRecognitionResult(intent.id, {
        status: DetectedIntentStatusEnum.escalated,
        ...recognitionResult(intent),
      });
    }

    return { escalated: true };
  };
}

// What the run already knows, so the agent does not have to re-derive it.
export function buildHandoffContext(
  state: IntentGraphStateType,
): HandoffContext {
  const action = state.topCatalogAction?.action;

  return {
    intent: action
      ? {
          actionName: action.name,
          description: action.description,
          confidence: state.topIntent?.confidenceScore ?? null,
        }
      : null,
    parameters: state.extractedParameters ?? {},
    missingParameters: state.missingParameters ?? [],
    failedExecutions: (state.executions ?? [])
      .filter(
        (execution) => execution.status === ActionExecutionStatusEnum.failed,
      )
      .map((execution) => ({
        statusCode: execution.responseStatusCode ?? null,
        error: execution.errorMessage ?? null,
      })),
    knowledgeQuery: state.knowledge?.rewrittenQuery ?? null,
    error: state.error ? `${state.error.node}: ${state.error.message}` : null,
  };
}
