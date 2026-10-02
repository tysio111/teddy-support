export enum DetectedIntentStatusEnum {
  detected = 'detected',
  belowThreshold = 'below_threshold',
  needsClarification = 'needs_clarification',
  awaitingConfirmation = 'awaiting_confirmation',
  declined = 'declined',
  executed = 'executed',
  executionFailed = 'execution_failed',
  escalated = 'escalated',
  failed = 'failed',
}
