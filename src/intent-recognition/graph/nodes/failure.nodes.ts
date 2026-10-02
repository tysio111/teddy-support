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
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    if (state.message) {
      await messagesService.createBotMessage(
        state.message.conversation,
        buildEscalationReply(state.outcome),
      );
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
