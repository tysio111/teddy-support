import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { ConversationsService } from '../conversations/conversations.service';
import { AppThrottlerGuard } from './app-throttler.guard';
import { ThrottlerNameEnum } from './rate-limit.constants';
import { ThrottleByConversation } from './throttle-by-conversation.decorator';

@Controller()
class TestController {
  @Post('messages')
  @ThrottleByConversation()
  create(@Body() body: unknown) {
    return body;
  }

  @Post('other')
  other() {
    return {};
  }
}

describe('AppThrottlerGuard', () => {
  let app: INestApplication;
  const conversations: Record<string, { client: { id: string } | null }> = {
    'conversation-1': { client: { id: 'client-1' } },
    'conversation-2': { client: { id: 'client-1' } },
    'conversation-3': { client: { id: 'client-1' } },
    'conversation-4': { client: null },
  };
  const conversationsService = {
    findById: jest.fn((id: string) => Promise.resolve(conversations[id])),
  };

  beforeEach(async () => {
    conversationsService.findById.mockClear();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true }),
        ThrottlerModule.forRoot({
          throttlers: [
            { name: ThrottlerNameEnum.ip, limit: 10, ttl: 60000 },
            { name: ThrottlerNameEnum.conversation, limit: 2, ttl: 60000 },
            { name: ThrottlerNameEnum.client, limit: 3, ttl: 60000 },
          ],
        }),
      ],
      controllers: [TestController],
      providers: [
        { provide: APP_GUARD, useClass: AppThrottlerGuard },
        { provide: ConversationsService, useValue: conversationsService },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const send = (conversationId?: string) =>
    request(app.getHttpServer())
      .post('/messages')
      .send(conversationId ? { conversation: { id: conversationId } } : {});

  it('should limit messages per conversation', async () => {
    await send('conversation-1').expect(201);
    await send('conversation-1').expect(201);
    await send('conversation-1').expect(429);
  });

  it('should limit messages per client across conversations', async () => {
    await send('conversation-1').expect(201);
    await send('conversation-2').expect(201);
    await send('conversation-3').expect(201);
    await send('conversation-3').expect(429);
  });

  it('should only limit conversations without a client per conversation', async () => {
    for (let i = 0; i < 2; i++) {
      await send('conversation-4').expect(201);
    }
    await send('conversation-4').expect(429);
  });

  it('should only apply the IP limit without a conversation', async () => {
    for (let i = 0; i < 10; i++) {
      await send().expect(201);
    }
    await send().expect(429);
    expect(conversationsService.findById).not.toHaveBeenCalled();
  });

  it('should not apply conversation limits to unmarked routes', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/other')
        .send({ conversation: { id: 'conversation-1' } })
        .expect(201);
    }
  });
});
