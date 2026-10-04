export type RateLimitConfig = {
  // Shared window of every limit below.
  ttlMs: number;
  // Requests per IP and route; 0 disables.
  ipLimit: number;
  // Messages per conversation on routes marked with @ThrottleByConversation;
  // 0 disables.
  conversationLimit: number;
  // Messages across all conversations of one client on the same routes;
  // 0 disables.
  clientLimit: number;
};
