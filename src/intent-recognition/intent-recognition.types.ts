import { Action } from '../actions/domain/action';
import { ActionParameter } from '../action-parameters/domain/action-parameter';
import { DetectedIntent } from '../detected-intents/domain/detected-intent';
import { Message } from '../messages/domain/message';
import {
  Citation,
  KnowledgeAnswerStatusEnum,
} from '../knowledge/knowledge.types';

export type CatalogAction = {
  action: Action;
  parameters: ActionParameter[];
};

export type IntentCandidate = {
  actionId: Action['id'];
  confidence: number;
  reasoning: string;
};

export type ExtractedParameters = Record<string, unknown>;

export type ParameterIssue = {
  name: string;
  reason: string;
};

// One per candidate that passed its confidence threshold; filled in by the
// parallel extraction branches and refined by validation / repair.
export type CandidateExtraction = {
  intentId: DetectedIntent['id'];
  actionId: Action['id'];
  rank: number;
  values: ExtractedParameters;
  missing: string[];
  invalid: ParameterIssue[];
  validated: boolean;
  // Set when extraction failed even after retries; the candidate is skipped.
  error: string | null;
};

// What the knowledge base path did; kept small since state is checkpointed.
export type KnowledgeRunSummary = {
  status: KnowledgeAnswerStatusEnum;
  rewrittenQuery: string;
  candidates: number;
  chunks: number;
  citations: Citation[];
};

export type GraphError = {
  node: string;
  message: string;
};

export type NodeMetric = {
  node: string;
  ms: number;
};

export type InterruptPayload =
  | {
      type: 'clarification';
      intentId: DetectedIntent['id'];
      missing: string[];
    }
  | {
      type: 'confirmation';
      intentId: DetectedIntent['id'];
      actionName: string;
    };

// Value passed back to `interrupt()` when a paused run is resumed.
export type ResumeValue = {
  messageId: Message['id'];
};

export enum GuardrailVerdictEnum {
  allow = 'allow',
  injection = 'injection',
  abuse = 'abuse',
  spam = 'spam',
}

export enum ConfirmationAnswerEnum {
  yes = 'yes',
  no = 'no',
  unclear = 'unclear',
}

export enum IntentOutcomeEnum {
  skipped = 'skipped',
  duplicate = 'duplicate',
  blocked = 'blocked',
  noActions = 'no_actions',
  noIntent = 'no_intent',
  // Knowledge base path (messages that match no action)
  answered = 'answered',
  noAnswer = 'no_answer',
  belowThreshold = 'below_threshold',
  needsClarification = 'needs_clarification',
  awaitingConfirmation = 'awaiting_confirmation',
  declined = 'declined',
  // The client answered a pending question with something unrelated; the
  // message must be processed as a fresh request.
  superseded = 'superseded',
  circuitOpen = 'circuit_open',
  executed = 'executed',
  executionFailed = 'execution_failed',
  failed = 'failed',
}
