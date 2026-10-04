// Facts the intent graph already knows at escalation time. Stored verbatim
// next to the LLM summary, so the agent never sees hallucinated parameters
// or execution results.
export type HandoffContext = {
  intent: {
    actionName: string;
    description: string;
    confidence: number | null;
  } | null;
  parameters: Record<string, unknown>;
  missingParameters: string[];
  failedExecutions: {
    statusCode: number | null;
    error: string | null;
  }[];
  knowledgeQuery: string | null;
  error: string | null;
};

export enum HandoffSentimentEnum {
  calm = 'calm',
  frustrated = 'frustrated',
  angry = 'angry',
}

export type HandoffSummary = {
  summary: string;
  clientGoal: string;
  attempted: string[];
  openQuestions: string[];
  suggestedNextStep: string;
  sentiment: HandoffSentimentEnum;
  language: string;
};
