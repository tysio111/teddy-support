import { z } from 'zod';
import { Action } from '../../actions/domain/action';
import { ActionParameter } from '../../action-parameters/domain/action-parameter';
import { Company } from '../../companies/domain/company';
import { DetectedIntent } from '../../detected-intents/domain/detected-intent';
import { Message } from '../../messages/domain/message';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';
import { buildParameterSchema } from '../llm/parameter-schema';
import { ActionExecutionResult } from '../execution/action-executor.service';
import {
  CandidateExtraction,
  CatalogAction,
  ConfirmationAnswerEnum,
  ExtractedParameters,
  IntentCandidate,
  ParameterIssue,
} from '../intent-recognition.types';
import { IntentGraphStateType } from './intent-graph.state';

export function resolveConfidenceThreshold(
  action: Action,
  company: Company | undefined,
  defaultThreshold: number,
): number {
  return (
    action.confidenceThreshold ??
    company?.confidenceThreshold ??
    defaultThreshold
  );
}

// Keeps only catalog actions (guards against hallucinated ids), one entry per
// action, highest confidence first.
export function normalizeCandidates(
  candidates: IntentCandidate[],
  catalogIds: Set<string>,
  maxCandidates: number,
): IntentCandidate[] {
  const seen = new Set<string>();

  return [...candidates]
    .sort((a, b) => b.confidence - a.confidence)
    .filter((candidate) => {
      if (!catalogIds.has(candidate.actionId) || seen.has(candidate.actionId)) {
        return false;
      }
      seen.add(candidate.actionId);
      return true;
    })
    .slice(0, maxCandidates);
}

// Input of one parallel extraction branch (sent with `Send`).
export type ExtractTask = {
  intentId: DetectedIntent['id'];
  rank: number;
  catalogAction: CatalogAction;
  history: Message[];
};

export function findCatalogAction(
  state: IntentGraphStateType,
  actionId: Action['id'],
): CatalogAction {
  return state.catalog.find(({ action }) => action.id === actionId)!;
}

export function toExtraction(
  task: ExtractTask,
  values: ExtractedParameters,
  error: string | null = null,
): CandidateExtraction {
  return {
    intentId: task.intentId,
    actionId: task.catalogAction.action.id,
    rank: task.rank,
    values,
    missing: [],
    invalid: [],
    validated: false,
    error,
  };
}

export function recognitionResult(intent: DetectedIntent) {
  return { extractedParameters: intent.extractedParameters ?? null };
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

// Business rules the structured-output schema cannot enforce: the model may
// return a well-typed string that is still not a valid email or date.
const FORMAT_RULES: Record<string, { schema: z.ZodType; reason: string }> = {
  email: { schema: z.email(), reason: 'must be a valid email address' },
  url: { schema: z.url(), reason: 'must be a valid URL' },
  date: { schema: z.iso.date(), reason: 'must be a date in YYYY-MM-DD format' },
  datetime: {
    schema: z.iso.datetime({ offset: true }),
    reason: 'must be an ISO 8601 date-time',
  },
};

export function validateExtraction(
  parameters: ActionParameter[],
  values: ExtractedParameters,
): { missing: string[]; invalid: ParameterIssue[] } {
  const missing = parameters
    .filter(
      (parameter) => parameter.isRequired && isBlank(values[parameter.name]),
    )
    .map((parameter) => parameter.name);

  const invalid: ParameterIssue[] = [];
  const schemaResult = buildParameterSchema(parameters).safeParse(values);
  if (!schemaResult.success) {
    for (const issue of schemaResult.error.issues) {
      const name = String(issue.path[0] ?? '');
      if (name && !missing.includes(name)) {
        invalid.push({ name, reason: issue.message });
      }
    }
  }

  for (const parameter of parameters) {
    const value = values[parameter.name];
    const rule = FORMAT_RULES[parameter.type?.toLowerCase()];
    if (
      rule &&
      !isBlank(value) &&
      !invalid.some((issue) => issue.name === parameter.name) &&
      !rule.schema.safeParse(value).success
    ) {
      invalid.push({ name: parameter.name, reason: rule.reason });
    }
  }

  return { missing, invalid };
}

export function isComplete(extraction: CandidateExtraction): boolean {
  return (
    !extraction.error &&
    extraction.validated &&
    !extraction.missing.length &&
    !extraction.invalid.length
  );
}

// Highest-ranked candidate whose extraction did not fail outright.
export function topExtraction(
  extractions: CandidateExtraction[],
): CandidateExtraction | undefined {
  return [...extractions]
    .sort((a, b) => a.rank - b.rank)
    .find((extraction) => !extraction.error);
}

const YES_PATTERN =
  /^\s*(yes|y|yeah|yep|yup|sure|ok|okay|confirm(ed)?|go ahead|do it|please do|correct|tak)\b/i;
const NO_PATTERN =
  /^\s*(no|n|nope|nah|cancel|stop|don'?t|do not|never ?mind|nie)\b/i;

// Deterministic on purpose: a side effect should only run on an explicit yes.
export function parseConfirmation(content: string): ConfirmationAnswerEnum {
  if (YES_PATTERN.test(content)) {
    return ConfirmationAnswerEnum.yes;
  }
  if (NO_PATTERN.test(content)) {
    return ConfirmationAnswerEnum.no;
  }
  return ConfirmationAnswerEnum.unclear;
}

export type ExecutionRetrySettings = {
  maxAttempts: number;
  baseMs: number;
  maxBackoffMs: number;
};

export function executionRetrySettings(
  config: IntentRecognitionConfig,
): ExecutionRetrySettings {
  return {
    maxAttempts: config.maxExecutionAttempts,
    baseMs: config.executionBackoffBaseMs,
    maxBackoffMs: config.executionMaxBackoffMs,
  };
}

export function shouldRetryExecution(
  result: ActionExecutionResult,
  attempts: number,
  settings: ExecutionRetrySettings,
): boolean {
  return (
    !result.success &&
    result.retryable &&
    attempts < settings.maxAttempts &&
    // The server asked us to wait longer than we are willing to block for.
    (result.retryAfterMs === null ||
      result.retryAfterMs <= settings.maxBackoffMs)
  );
}

// Exponential backoff with full jitter (spreads retries from many clients),
// unless the server told us exactly how long to wait.
export function computeBackoffMs(
  attempt: number,
  retryAfterMs: number | null,
  settings: ExecutionRetrySettings,
  random: () => number = Math.random,
): number {
  if (retryAfterMs !== null) {
    return Math.min(retryAfterMs, settings.maxBackoffMs);
  }

  const ceiling = Math.min(
    settings.maxBackoffMs,
    settings.baseMs * 2 ** Math.max(0, attempt - 1),
  );
  return Math.round(random() * ceiling);
}
