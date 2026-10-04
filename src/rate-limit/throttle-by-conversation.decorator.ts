import { SetMetadata } from '@nestjs/common';

export const THROTTLE_BY_CONVERSATION = 'throttleByConversation';

// Reads the conversation id from the raw request: guards run before
// validation pipes, so the value is not validated yet.
export type ConversationIdResolver = (
  req: Record<string, any>,
) => string | undefined;

export const conversationIdFromBody: ConversationIdResolver = (req) => {
  const id: unknown = req.body?.conversation?.id;
  return typeof id === 'string' && id ? id : undefined;
};

// Applies the per-conversation and per-client rate limits to a route, on top
// of the per-IP limit every route has.
export const ThrottleByConversation = (
  resolve: ConversationIdResolver = conversationIdFromBody,
) => SetMetadata(THROTTLE_BY_CONVERSATION, resolve);
