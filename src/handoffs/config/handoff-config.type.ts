export type HandoffConfig = {
  // Shared with intent recognition; without it summaries are marked failed.
  anthropicApiKey?: string;
  summaryModel: string;
  // Most recent messages passed to the summary prompt.
  summaryHistoryLimit: number;
};
