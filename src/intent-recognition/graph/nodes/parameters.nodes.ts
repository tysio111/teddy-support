import { DetectedIntentStatusEnum } from '../../../detected-intents/detected-intent-status.enum';
import { IntentOutcomeEnum } from '../../intent-recognition.types';
import { IntentGraphDeps } from '../intent-graph.deps';
import {
  ExtractTask,
  findCatalogAction,
  isComplete,
  topExtraction,
  toExtraction,
  validateExtraction,
} from '../intent-graph.helpers';
import { IntentGraphStateType, IntentGraphUpdate } from '../intent-graph.state';

export function extractParameters({ intentLlmService }: IntentGraphDeps) {
  return async (task: ExtractTask): Promise<IntentGraphUpdate> => {
    const values = await intentLlmService.extractParameters({
      history: task.history,
      action: task.catalogAction.action,
      parameters: task.catalogAction.parameters,
    });

    return { candidateExtractions: [toExtraction(task, values)] };
  };
}

// Pure and only writes the merge-reduced channel, so it is safe to run more
// than once per step (e.g. when an extraction error handler also routes here).
export function validateParameters(
  state: IntentGraphStateType,
): Promise<IntentGraphUpdate> {
  const validated = state.candidateExtractions
    .filter((extraction) => !extraction.error && !extraction.validated)
    .map((extraction) => ({
      ...extraction,
      ...validateExtraction(
        findCatalogAction(state, extraction.actionId).parameters,
        extraction.values,
      ),
      validated: true,
    }));

  return Promise.resolve({ candidateExtractions: validated });
}

export function repairParameters({ intentLlmService }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const top = topExtraction(state.candidateExtractions)!;
    const { action, parameters } = findCatalogAction(state, top.actionId);

    const values = await intentLlmService.repairParameters({
      history: state.history,
      action,
      parameters,
      previousValues: top.values,
      issues: top.invalid,
    });

    return {
      repairAttempts: state.repairAttempts + 1,
      candidateExtractions: [
        { ...top, values, missing: [], invalid: [], validated: false },
      ],
    };
  };
}

// Picks the highest-ranked candidate whose extraction succeeded. Lower-ranked
// candidates are a failover, not an alternative: an incomplete top candidate
// leads to a clarifying question rather than running a different action.
export function selectCandidate({
  logger,
  detectedIntentsService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const chosen = topExtraction(state.candidateExtractions);
    if (!chosen) {
      return {
        error: {
          node: 'extractParameters',
          message:
            state.candidateExtractions.find((extraction) => extraction.error)
              ?.error ?? 'No candidate could be extracted',
        },
      };
    }

    if (chosen.rank > 1) {
      logger.warn(
        `Message ${state.messageId}: falling back to candidate #${chosen.rank}`,
      );
    }

    const missing = [
      ...chosen.missing,
      ...chosen.invalid.map((issue) => issue.name),
    ];
    // Never pass values that failed validation on to the endpoint.
    const values = {
      ...chosen.values,
      ...Object.fromEntries(chosen.invalid.map((issue) => [issue.name, null])),
    };
    const needsClarification = !isComplete(chosen);
    const intent = state.intents.find(({ id }) => id === chosen.intentId)!;

    const topIntent = await detectedIntentsService.updateRecognitionResult(
      intent.id,
      {
        status: needsClarification
          ? DetectedIntentStatusEnum.needsClarification
          : DetectedIntentStatusEnum.detected,
        extractedParameters: JSON.stringify({
          values,
          missing,
          invalid: chosen.invalid,
        }),
      },
    );

    return {
      topIntent: topIntent ?? intent,
      topCatalogAction: findCatalogAction(state, chosen.actionId),
      extractedParameters: values,
      missingParameters: missing,
      outcome: needsClarification ? IntentOutcomeEnum.needsClarification : null,
    };
  };
}
