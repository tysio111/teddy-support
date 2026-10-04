// Side effects live in the ask* nodes, the pause in the await* nodes: a node
// re-runs from the top when resumed, so a message sent before `interrupt()`
// would be sent twice.
import { interrupt } from '@langchain/langgraph';
import { DetectedIntentStatusEnum } from '../../../detected-intents/detected-intent-status.enum';
import {
  buildClarificationQuestion,
  buildConfirmationQuestion,
} from '../../prompts/bot-replies';
import { matchesHumanRequest } from '../../prompts/human-request.prompt';
import {
  ConfirmationAnswerEnum,
  InterruptPayload,
  IntentOutcomeEnum,
  ResumeValue,
} from '../../intent-recognition.types';
import { IntentGraphDeps } from '../intent-graph.deps';
import {
  combineBurst,
  parseConfirmation,
  recognitionResult,
} from '../intent-graph.helpers';
import { IntentGraphStateType, IntentGraphUpdate } from '../intent-graph.state';

export function askClarification({ messagesService }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const { action, parameters } = state.topCatalogAction!;

    await messagesService.createBotMessage(
      state.message!.conversation,
      buildClarificationQuestion(action, parameters, state.missingParameters),
    );

    return { clarificationRounds: state.clarificationRounds + 1 };
  };
}

export function awaitClarification({
  config,
  logger,
  messagesService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const answer = interrupt<InterruptPayload, ResumeValue>({
      type: 'clarification',
      intentId: state.topIntent!.id,
      missing: state.missingParameters,
    });
    logger.debug(
      `Intent ${state.topIntent!.id}: clarification received in message ${answer.messageId}`,
    );

    // Asking for a human instead of answering: the listener processes the
    // message from scratch, and classification escalates it.
    if (matchesHumanRequest(await replyContent(messagesService, answer))) {
      return { outcome: IntentOutcomeEnum.superseded };
    }

    // The reply is now part of the conversation; re-extract from it.
    const history = await messagesService.findRecentByConversationId(
      state.message!.conversation.id,
      config.historyLimit,
    );

    return { history, outcome: null };
  };
}

export function askConfirmation({
  messagesService,
  detectedIntentsService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const topIntent = state.topIntent!;

    await messagesService.createBotMessage(
      state.message!.conversation,
      buildConfirmationQuestion(
        state.topCatalogAction!.action,
        state.extractedParameters,
      ),
    );
    await detectedIntentsService.updateRecognitionResult(topIntent.id, {
      status: DetectedIntentStatusEnum.awaitingConfirmation,
      ...recognitionResult(topIntent),
    });

    return { outcome: IntentOutcomeEnum.awaitingConfirmation };
  };
}

export function awaitConfirmation({
  messagesService,
  detectedIntentsService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const topIntent = state.topIntent!;
    const answer = interrupt<InterruptPayload, ResumeValue>({
      type: 'confirmation',
      intentId: topIntent.id,
      actionName: state.topCatalogAction!.action.name,
    });

    const content = await replyContent(messagesService, answer);
    const decision = matchesHumanRequest(content)
      ? ConfirmationAnswerEnum.unclear
      : parseConfirmation(content);
    if (decision === ConfirmationAnswerEnum.yes) {
      return { outcome: null };
    }

    await detectedIntentsService.updateRecognitionResult(topIntent.id, {
      status: DetectedIntentStatusEnum.declined,
      ...recognitionResult(topIntent),
    });

    // Anything other than a clear yes/no is treated as a new request; the
    // listener processes that message from scratch.
    return {
      outcome:
        decision === ConfirmationAnswerEnum.no
          ? IntentOutcomeEnum.declined
          : IntentOutcomeEnum.superseded,
    };
  };
}

async function replyContent(
  messagesService: IntentGraphDeps['messagesService'],
  answer: ResumeValue,
): Promise<string> {
  const replies = await messagesService.findByIds([
    ...(answer.precedingMessageIds ?? []),
    answer.messageId,
  ]);
  return replies.length ? combineBurst(replies).content : '';
}
