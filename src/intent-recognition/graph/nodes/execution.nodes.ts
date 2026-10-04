import { ActionExecutionStatusEnum } from '../../../action-executions/action-execution-status.enum';
import { DetectedIntentStatusEnum } from '../../../detected-intents/detected-intent-status.enum';
import { CircuitStateEnum } from '../../execution/circuit-breaker.service';
import {
  buildDeclinedReply,
  buildFallbackReply,
} from '../../prompts/bot-replies';
import { OutputReviewVerdictEnum } from '../../../utils/output-review';
import { IntentOutcomeEnum } from '../../intent-recognition.types';
import { IntentGraphDeps } from '../intent-graph.deps';
import {
  computeBackoffMs,
  executionRetrySettings,
  recognitionResult,
} from '../intent-graph.helpers';
import { IntentGraphStateType, IntentGraphUpdate } from '../intent-graph.state';

export function checkCircuit({
  logger,
  circuitBreakerService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const action = state.topCatalogAction!.action;
    const circuit = await circuitBreakerService.getState(action);

    if (circuit === CircuitStateEnum.open) {
      logger.warn(`Circuit open for action ${action.id}, skipping call`);
      return { outcome: IntentOutcomeEnum.circuitOpen };
    }
    if (circuit === CircuitStateEnum.halfOpen) {
      logger.log(`Circuit half-open for action ${action.id}, probing`);
    }

    return {};
  };
}

export function executeAction({
  actionsService,
  actionExecutorService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const actionId = state.topCatalogAction!.action.id;
    // Loaded just in time so credentials never enter the checkpointed state.
    const action = await actionsService.findById(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} no longer exists`);
    }

    const executionResult = await actionExecutorService.execute(
      action,
      state.extractedParameters,
      // Stable across retries, so the endpoint can deduplicate them.
      { idempotencyKey: state.topIntent!.id },
    );

    return {
      executionResult,
      executionAttempts: state.executionAttempts + 1,
    };
  };
}

// Every attempt gets its own ActionExecution row: a full audit trail, and
// the data the circuit breaker works from.
export function recordAttempt({ actionExecutionsService }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const result = state.executionResult!;

    const execution = await actionExecutionsService.record({
      action: state.topCatalogAction!.action,
      detectedIntent: state.topIntent!,
      requestPayload: result.requestPayload,
      status: result.success
        ? ActionExecutionStatusEnum.success
        : ActionExecutionStatusEnum.failed,
      responseStatusCode: result.responseStatusCode,
      responsePayload: result.responsePayload,
      errorMessage: result.errorMessage,
      executedAt: result.executedAt,
    });

    return { executions: [execution] };
  };
}

export function backoff({ config, logger }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const delayMs = computeBackoffMs(
      state.executionAttempts,
      state.executionResult!.retryAfterMs,
      executionRetrySettings(config),
    );
    logger.warn(
      `Action ${state.topCatalogAction!.action.id} attempt ${state.executionAttempts} failed ` +
        `(${state.executionResult!.errorMessage}), retrying in ${delayMs}ms`,
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return {};
  };
}

export function finalizeExecution({ detectedIntentsService }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const success = state.executionResult!.success;

    await detectedIntentsService.updateRecognitionResult(state.topIntent!.id, {
      status: success
        ? DetectedIntentStatusEnum.executed
        : DetectedIntentStatusEnum.executionFailed,
      ...recognitionResult(state.topIntent!),
    });

    return {
      outcome: success
        ? IntentOutcomeEnum.executed
        : IntentOutcomeEnum.executionFailed,
    };
  };
}

export function generateResponse({
  config,
  logger,
  messagesService,
  intentLlmService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    let content: string;
    if (state.outcome === IntentOutcomeEnum.declined) {
      content = buildDeclinedReply();
    } else {
      const action = state.topCatalogAction!.action;
      const input = {
        action,
        parameters: state.extractedParameters,
        responsePayload: state.executionResult?.responsePayload ?? null,
      };
      content = await intentLlmService.generateReply(input);

      // Output guardrail: the action already ran, so a rejected reply is
      // replaced with the canned one rather than handed over.
      if (config.outputGuardrailEnabled) {
        const review = await intentLlmService.reviewReply({
          ...input,
          message: state.message!.content,
          reply: content,
        });
        if (review.verdict !== OutputReviewVerdictEnum.pass) {
          logger.warn(
            `Reply for message ${state.messageId} rejected by output review ` +
              `(${review.verdict}): ${review.reason}`,
          );
          content = buildFallbackReply(action);
        }
      }
    }

    await messagesService.createBotMessage(
      state.message!.conversation,
      content,
    );
    return {};
  };
}

// Error handler of generateResponse: a canned reply beats no reply.
export function sendFallbackReply({ messagesService }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    await messagesService.createBotMessage(
      state.message!.conversation,
      state.outcome === IntentOutcomeEnum.declined
        ? buildDeclinedReply()
        : buildFallbackReply(state.topCatalogAction!.action),
    );
    return {};
  };
}
