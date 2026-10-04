export type IntentCheckpointer = 'postgres' | 'memory';

export type IntentRecognitionConfig = {
  enabled: boolean;
  anthropicApiKey?: string;
  model: string;
  fallbackModel?: string;
  historyLimit: number;
  maxCandidates: number;
  defaultConfidenceThreshold: number;
  actionExecutionTimeoutMs: number;

  // Resilience
  guardrailEnabled: boolean;
  // Checks generated replies against the action result and the policy.
  outputGuardrailEnabled: boolean;
  llmNodeTimeoutMs: number;
  maxRepairAttempts: number;
  maxClarificationRounds: number;
  maxExecutionAttempts: number;
  executionBackoffBaseMs: number;
  executionMaxBackoffMs: number;

  // Circuit breaker (per action endpoint)
  circuitWindowMs: number;
  circuitFailureRate: number;
  circuitMinCalls: number;
  circuitCooldownMs: number;

  // Durable execution / human-in-the-loop
  checkpointer: IntentCheckpointer;
  pendingInputTtlMs: number;

  // Message debounce: a burst of client messages is processed as one run
  debounceMs: number;
  debounceMaxWaitMs: number;
};
