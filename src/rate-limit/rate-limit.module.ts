import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerOptions } from '@nestjs/throttler';
import { AllConfigType } from '../config/config.type';
import { ConversationsModule } from '../conversations/conversations.module';
import { AppThrottlerGuard } from './app-throttler.guard';
import { ThrottlerNameEnum } from './rate-limit.constants';

// Counters live in memory (per instance): multiple replicas need a shared
// ThrottlerStorage, e.g. Redis.
@Module({
  imports: [
    ConversationsModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const config = configService.getOrThrow('rateLimit', { infer: true });
        const throttlers: ThrottlerOptions[] = [
          { name: ThrottlerNameEnum.ip, limit: config.ipLimit },
          {
            name: ThrottlerNameEnum.conversation,
            limit: config.conversationLimit,
          },
          { name: ThrottlerNameEnum.client, limit: config.clientLimit },
        ]
          .filter(({ limit }) => limit > 0)
          .map((throttler) => ({ ...throttler, ttl: config.ttlMs }));

        return {
          throttlers,
          // Conversation and client counters are shared by every route that
          // uses them; the per-IP counter stays per route (the default).
          generateKey: (context, tracker, name) =>
            name === ThrottlerNameEnum.ip
              ? `${context.getClass().name}-${context.getHandler().name}-${name}-${tracker}`
              : `${name}-${tracker}`,
        };
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class RateLimitModule {}
