import { END, Send } from '@langchain/langgraph';
import { DetectedIntentStatusEnum } from '../../detected-intents/detected-intent-status.enum';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';
import { IntentOutcomeEnum } from '../intent-recognition.types';
import {
  executionRetrySettings,
  ExtractTask,
  findCatalogAction,
  shouldRetryExecution,
  topExtraction,
} from './intent-graph.helpers';
import { IntentGraphStateType } from './intent-graph.state';

export function continueOrEnd<T extends string>(next: T) {
  return (state: IntentGraphStateType): T | typeof END =>
    state.outcome ? END : next;
}

// An explicit request for a human escalates. Messages that match no action
// (or arrive when there are none) go to the knowledge base when it is enabled;
// other outcomes end the run.
export function routeAfterClassification(
  state: IntentGraphStateType,
  knowledgeEnabled: boolean,
) {
  if (state.outcome === IntentOutcomeEnum.humanRequested) {
    return 'escalateToHuman';
  }

  const unmatched =
    state.outcome === IntentOutcomeEnum.noIntent ||
    state.outcome === IntentOutcomeEnum.noActions;

  if (unmatched && knowledgeEnabled) {
    return 'answerFromKnowledge';
  }
  return state.outcome ? END : 'persistIntents';
}

export function routeAfterKnowledge(state: IntentGraphStateType) {
  return state.outcome === IntentOutcomeEnum.noAnswer ||
    state.outcome === IntentOutcomeEnum.replyRejected
    ? 'escalateToHuman'
    : END;
}

// Fan-out: extract parameters for every candidate above its threshold in
// parallel, so a fallback candidate is ready without another round trip.
export function routeAfterPersist(state: IntentGraphStateType) {
  if (state.outcome) {
    return 'escalateToHuman';
  }

  return state.intents
    .filter((intent) => intent.status === DetectedIntentStatusEnum.detected)
    .map((intent) => {
      const task: ExtractTask = {
        intentId: intent.id,
        rank: intent.rank!,
        catalogAction: findCatalogAction(
          state,
          state.candidates[intent.rank! - 1].actionId,
        ),
        history: state.history,
      };
      return new Send('extractParameters', task);
    });
}

export function routeAfterValidation(
  state: IntentGraphStateType,
  config: IntentRecognitionConfig,
) {
  const top = topExtraction(state.candidateExtractions);

  return top?.invalid.length && state.repairAttempts < config.maxRepairAttempts
    ? 'repairParameters'
    : 'selectCandidate';
}

export function routeAfterSelection(
  state: IntentGraphStateType,
  config: IntentRecognitionConfig,
) {
  if (state.error) {
    return 'handleError';
  }
  if (state.missingParameters.length) {
    return state.clarificationRounds < config.maxClarificationRounds
      ? 'askClarification'
      : 'escalateToHuman';
  }
  if (state.topCatalogAction!.action.requiresConfirmation) {
    return 'askConfirmation';
  }
  return 'checkCircuit';
}

export function reExtractSelected(state: IntentGraphStateType) {
  if (state.outcome === IntentOutcomeEnum.superseded) {
    return END;
  }

  const extraction = state.candidateExtractions.find(
    ({ intentId }) => intentId === state.topIntent!.id,
  )!;
  const task: ExtractTask = {
    intentId: extraction.intentId,
    rank: extraction.rank,
    catalogAction: state.topCatalogAction!,
    history: state.history,
  };

  return [new Send('extractParameters', task)];
}

export function routeAfterConfirmation(state: IntentGraphStateType) {
  switch (state.outcome) {
    case IntentOutcomeEnum.declined:
      return 'generateResponse';
    case IntentOutcomeEnum.superseded:
      return END;
    default:
      return 'checkCircuit';
  }
}

export function routeAfterCircuit(state: IntentGraphStateType) {
  return state.outcome === IntentOutcomeEnum.circuitOpen
    ? 'escalateToHuman'
    : 'executeAction';
}

export function routeAfterAttempt(
  state: IntentGraphStateType,
  config: IntentRecognitionConfig,
) {
  return shouldRetryExecution(
    state.executionResult!,
    state.executionAttempts,
    executionRetrySettings(config),
  )
    ? 'backoff'
    : 'finalizeExecution';
}

export function routeAfterFinalize(state: IntentGraphStateType) {
  return state.outcome === IntentOutcomeEnum.executed
    ? 'generateResponse'
    : 'escalateToHuman';
}
