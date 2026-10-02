import { Annotation } from '@langchain/langgraph';
import { Message } from '../../messages/domain/message';
import { DetectedIntent } from '../../detected-intents/domain/detected-intent';
import { ActionExecution } from '../../action-executions/domain/action-execution';
import {
  CandidateExtraction,
  CatalogAction,
  ExtractedParameters,
  GraphError,
  IntentCandidate,
  IntentOutcomeEnum,
  KnowledgeRunSummary,
  NodeMetric,
} from '../intent-recognition.types';
import { ActionExecutionResult } from '../execution/action-executor.service';

// Reducer channels accumulate across nodes (and across parallel branches), so
// they need an explicit reset: writing `null` clears them. Fresh runs on a
// reused thread rely on this, see `freshRunInput`.
function appendable<T>() {
  return Annotation<T[], T[] | null>({
    reducer: (current, update) =>
      update === null ? [] : current.concat(update),
    default: () => [],
  });
}

// Upsert by intent id so validation / repair / re-extraction can refine an
// entry written by a parallel extraction branch.
function mergeExtractions(
  current: CandidateExtraction[],
  update: CandidateExtraction[] | null,
): CandidateExtraction[] {
  if (update === null) {
    return [];
  }

  const byIntent = new Map(current.map((entry) => [entry.intentId, entry]));
  for (const entry of update) {
    byIntent.set(entry.intentId, entry);
  }

  return [...byIntent.values()].sort((a, b) => a.rank - b.rank);
}

export const IntentGraphState = Annotation.Root({
  // Input
  messageId: Annotation<Message['id']>,

  // Context
  message: Annotation<Message | null>,
  history: Annotation<Message[]>,
  catalog: Annotation<CatalogAction[]>,

  // Classification
  candidates: Annotation<IntentCandidate[]>,
  // Persisted DetectedIntents, one per candidate, ordered by rank.
  intents: Annotation<DetectedIntent[]>,

  // Parameter extraction (fan-out), validation and repair
  candidateExtractions: Annotation<
    CandidateExtraction[],
    CandidateExtraction[] | null
  >({
    reducer: mergeExtractions,
    default: () => [],
  }),
  repairAttempts: Annotation<number>,
  clarificationRounds: Annotation<number>,

  // Selected candidate
  topIntent: Annotation<DetectedIntent | null>,
  topCatalogAction: Annotation<CatalogAction | null>,
  extractedParameters: Annotation<ExtractedParameters>,
  missingParameters: Annotation<string[]>,

  // Execution (retried with backoff, one ActionExecution row per attempt)
  executionResult: Annotation<ActionExecutionResult | null>,
  executionAttempts: Annotation<number>,
  executions: appendable<ActionExecution>(),

  // Knowledge base (messages that match no action)
  knowledge: Annotation<KnowledgeRunSummary | null>,

  // Failure handling
  error: Annotation<GraphError | null>,
  escalated: Annotation<boolean>,

  // Observability
  metrics: appendable<NodeMetric>(),

  // Set once the graph reaches a terminal state
  outcome: Annotation<IntentOutcomeEnum | null>,
});

export type IntentGraphStateType = typeof IntentGraphState.State;
export type IntentGraphUpdate = typeof IntentGraphState.Update;

// Threads are keyed by conversation, so a new run inherits the previous run's
// checkpoint. Reset every channel explicitly to start from a clean slate.
export function freshRunInput(input: {
  messageId: Message['id'];
}): IntentGraphUpdate {
  return {
    ...input,
    message: null,
    history: [],
    catalog: [],
    candidates: [],
    intents: [],
    candidateExtractions: null,
    repairAttempts: 0,
    clarificationRounds: 0,
    topIntent: null,
    topCatalogAction: null,
    extractedParameters: {},
    missingParameters: [],
    executionResult: null,
    executionAttempts: 0,
    executions: null,
    knowledge: null,
    error: null,
    escalated: false,
    metrics: null,
    outcome: null,
  };
}
