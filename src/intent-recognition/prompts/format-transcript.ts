import { Message } from '../../messages/domain/message';

export function formatTranscript(history: Message[]): string {
  if (!history.length) {
    return '(no previous messages)';
  }

  return history
    .map((message) => `[${message.sender}]: ${message.content}`)
    .join('\n');
}
