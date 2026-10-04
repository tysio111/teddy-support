// Named throttlers (see RateLimitModule). `default` is the per-IP limit.
export enum ThrottlerNameEnum {
  ip = 'default',
  conversation = 'conversation',
  client = 'client',
}
