import { ConversationTurn } from '../knowledge.types';

export function formatTurns(turns: ConversationTurn[]): string {
  if (!turns.length) {
    return '(no previous messages)';
  }

  return turns
    .map(({ sender, content }) => `[${sender}]: ${content}`)
    .join('\n');
}
