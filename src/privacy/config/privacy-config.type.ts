export type PrivacyConfig = {
  // Masks card numbers, emails and phones in LLM prompts and in logs.
  piiRedactionEnabled: boolean;
  // Conversations inactive for longer are deleted. Unset keeps them forever.
  retentionDays: number | null;
  retentionIntervalMinutes: number;
};
