import { Action } from '../actions/domain/action';
import { ActionParameter } from '../action-parameters/domain/action-parameter';

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

export enum IntentOutcomeEnum {
  skipped = 'skipped',
  noActions = 'no_actions',
  noIntent = 'no_intent',
  belowThreshold = 'below_threshold',
  needsClarification = 'needs_clarification',
  executed = 'executed',
  executionFailed = 'execution_failed',
}
