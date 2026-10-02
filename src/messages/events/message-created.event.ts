export const MESSAGE_CREATED_EVENT = 'message.created';

export class MessageCreatedEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly sender: string,
  ) {}
}
