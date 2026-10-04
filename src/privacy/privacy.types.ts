// Rows deleted, per table.
export type ErasureResult = {
  conversations: number;
  messages: number;
  detectedIntents: number;
  actionExecutions: number;
  handoffs: number;
};

export type RetentionResult = ErasureResult & {
  clients: number;
};
