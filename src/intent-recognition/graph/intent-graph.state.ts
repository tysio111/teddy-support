import { Annotation } from '@langchain/langgraph';
import { Message } from '../../messages/domain/message';
import { DetectedIntent } from '../../detected-intents/domain/detected-intent';
import { ActionExecution } from '../../action-executions/domain/action-execution';
import {
  CatalogAction,
  ExtractedParameters,
  IntentCandidate,
  IntentOutcomeEnum,
} from '../intent-recognition.types';
import { ActionExecutionResult } from '../execution/action-executor.service';

export const IntentGraphState = Annotation.Root({
  // Input
  messageId: Annotation<Message['id']>,
  companyId: Annotation<string>,

  // Context
  message: Annotation<Message | null>,
  history: Annotation<Message[]>,
  catalog: Annotation<CatalogAction[]>,

  // Classification
  candidates: Annotation<IntentCandidate[]>,
  topIntent: Annotation<DetectedIntent | null>,
  topCatalogAction: Annotation<CatalogAction | null>,

  // Parameter extraction
  extractedParameters: Annotation<ExtractedParameters>,
  missingParameters: Annotation<string[]>,

  // Execution
  executionResult: Annotation<ActionExecutionResult | null>,
  execution: Annotation<ActionExecution | null>,

  // Set once the graph reaches a terminal state
  outcome: Annotation<IntentOutcomeEnum | null>,
});

export type IntentGraphStateType = typeof IntentGraphState.State;
export type IntentGraphUpdate = typeof IntentGraphState.Update;
