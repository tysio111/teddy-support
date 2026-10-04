export enum ConversationStatusEnum {
  // The bot handles the conversation (new, or handed back by an agent).
  open = 'open',
  // Waiting in the hand-off inbox; the bot is paused.
  escalated = 'escalated',
  // An agent owns the conversation; the bot is paused.
  assigned = 'assigned',
  resolved = 'resolved',
}

export const BOT_PAUSED_STATUSES: string[] = [
  ConversationStatusEnum.escalated,
  ConversationStatusEnum.assigned,
];
