import { DetectedIntentStatusEnum } from '../../../detected-intents/detected-intent-status.enum';
import { IntentOutcomeEnum } from '../../intent-recognition.types';
import { IntentGraphDeps } from '../intent-graph.deps';
import {
  findCatalogAction,
  normalizeCandidates,
  resolveConfidenceThreshold,
} from '../intent-graph.helpers';
import { IntentGraphStateType, IntentGraphUpdate } from '../intent-graph.state';

export function classifyIntent({ config, intentLlmService }: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const candidates = normalizeCandidates(
      await intentLlmService.classify({
        history: state.history,
        message: state.message!,
        catalog: state.catalog,
        maxCandidates: config.maxCandidates,
      }),
      new Set(state.catalog.map(({ action }) => action.id)),
      config.maxCandidates,
    );

    return candidates.length
      ? { candidates }
      : { candidates, outcome: IntentOutcomeEnum.noIntent };
  };
}

export function persistIntents({
  config,
  detectedIntentsService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const message = state.message!;

    const intents = await Promise.all(
      state.candidates.map((candidate, index) => {
        const { action } = findCatalogAction(state, candidate.actionId);
        const threshold = resolveConfidenceThreshold(
          action,
          config.defaultConfidenceThreshold,
        );

        return detectedIntentsService.createForMessage({
          status:
            candidate.confidence < threshold
              ? DetectedIntentStatusEnum.belowThreshold
              : DetectedIntentStatusEnum.detected,
          rank: index + 1,
          confidenceScore: candidate.confidence,
          action,
          message,
          extractedParameters: null,
        });
      }),
    );

    return intents[0].status === DetectedIntentStatusEnum.belowThreshold
      ? {
          intents,
          topIntent: intents[0],
          outcome: IntentOutcomeEnum.belowThreshold,
        }
      : { intents };
  };
}
