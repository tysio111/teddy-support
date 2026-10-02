export type IntentRecognitionConfig = {
  enabled: boolean;
  anthropicApiKey?: string;
  model: string;
  historyLimit: number;
  maxCandidates: number;
  defaultConfidenceThreshold: number;
  actionExecutionTimeoutMs: number;
};
