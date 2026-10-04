import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '../messages/events/message-created.event';
import { IntentGraphService } from './graph/intent-graph.service';
import { IntentRecognitionListener } from './intent-recognition.listener';
import { ConversationsService } from '../conversations/conversations.service';
import { BOT_PAUSED_STATUSES } from '../conversations/conversation-status.enum';
import { MessagesService } from '../messages/messages.service';
import { HandoffsService } from '../handoffs/handoffs.service';

const result = (outcome: string) => ({
  outcome,
  metrics: [],
  escalated: false,
  pendingInput: null,
  usage: { llmCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
});

describe('IntentRecognitionListener', () => {
  async function setup(
    enabled = true,
    debounceMs = 0,
    conversationBudgetUsd: number | null = null,
  ) {
    const config: Record<string, unknown> = {
      'intentRecognition.enabled': enabled,
      'intentRecognition.debounceMs': debounceMs,
      'intentRecognition.debounceMaxWaitMs': 5000,
      'intentRecognition.conversationBudgetUsd': conversationBudgetUsd,
    };
    const intentGraphService = {
      run: jest.fn().mockResolvedValue(result('no_intent')),
      resume: jest.fn().mockResolvedValue(result('executed')),
      getPendingInput: jest.fn().mockResolvedValue(null),
    };
    const conversationsService = {
      findById: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve({ id, status: 'open' }),
        ),
      setStatus: jest.fn().mockResolvedValue(undefined),
      isBotPaused: jest.fn(({ status }: { status: string }) =>
        BOT_PAUSED_STATUSES.includes(status),
      ),
    };
    const messagesService = {
      createBotMessage: jest.fn().mockResolvedValue(undefined),
    };
    const handoffsService = {
      open: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        IntentRecognitionListener,
        { provide: IntentGraphService, useValue: intentGraphService },
        { provide: ConversationsService, useValue: conversationsService },
        { provide: MessagesService, useValue: messagesService },
        { provide: HandoffsService, useValue: handoffsService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => config[key],
            getOrThrow: (key: string) => config[key],
          },
        },
      ],
    }).compile();
    await moduleRef.init();

    return {
      eventEmitter: moduleRef.get(EventEmitter2),
      listener: moduleRef.get(IntentRecognitionListener),
      intentGraphService,
      conversationsService,
      messagesService,
      handoffsService,
    };
  }

  // `async: true` listeners run on a later tick, after emit returns.
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  const input = {
    messageId: 'message-1',
    conversationId: 'conversation-1',
    precedingMessageIds: [],
  };

  const event = (sender: string) =>
    new MessageCreatedEvent('message-1', 'conversation-1', sender);

  it('should run the intent graph for client messages', async () => {
    const { eventEmitter, intentGraphService } = await setup();

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(intentGraphService.run).toHaveBeenCalledWith(input);
    expect(intentGraphService.resume).not.toHaveBeenCalled();
  });

  it('should not run the bot while an agent handles the conversation', async () => {
    const { eventEmitter, intentGraphService, conversationsService } =
      await setup();
    conversationsService.findById.mockResolvedValue({
      id: 'conversation-1',
      status: 'assigned',
    });

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(intentGraphService.run).not.toHaveBeenCalled();
    expect(intentGraphService.resume).not.toHaveBeenCalled();
  });

  it('should reopen a resolved conversation when the client writes again', async () => {
    const { eventEmitter, intentGraphService, conversationsService } =
      await setup();
    conversationsService.findById.mockResolvedValue({
      id: 'conversation-1',
      status: 'resolved',
    });

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(conversationsService.setStatus).toHaveBeenCalledWith(
      'conversation-1',
      'open',
    );
    expect(intentGraphService.run).toHaveBeenCalledWith(input);
  });

  describe('cost budget', () => {
    const spent = (llmCostUsd: number) => ({
      id: 'conversation-1',
      status: 'open',
      llmCostUsd,
    });

    it('should hand off a conversation that used up its budget', async () => {
      const {
        eventEmitter,
        intentGraphService,
        conversationsService,
        messagesService,
        handoffsService,
      } = await setup(true, 0, 1);
      conversationsService.findById.mockResolvedValue(spent(1.2));

      eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
      await flush();
      await flush();

      expect(intentGraphService.run).not.toHaveBeenCalled();
      expect(messagesService.createBotMessage).toHaveBeenCalledWith(
        spent(1.2),
        expect.any(String),
      );
      expect(handoffsService.open).toHaveBeenCalledWith(spent(1.2), {
        reason: 'budget_exceeded',
        context: null,
      });
    });

    it('should run the graph while under budget', async () => {
      const { eventEmitter, intentGraphService, conversationsService } =
        await setup(true, 0, 1);
      conversationsService.findById.mockResolvedValue(spent(0.4));

      eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
      await flush();

      expect(intentGraphService.run).toHaveBeenCalledWith(input);
    });

    it('should not limit spend without a budget', async () => {
      const {
        eventEmitter,
        intentGraphService,
        conversationsService,
        handoffsService,
      } = await setup();
      conversationsService.findById.mockResolvedValue(spent(100));

      eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
      await flush();

      expect(intentGraphService.run).toHaveBeenCalledWith(input);
      expect(handoffsService.open).not.toHaveBeenCalled();
    });
  });

  it('should resume a run that is waiting for the client', async () => {
    const { eventEmitter, intentGraphService } = await setup();
    intentGraphService.getPendingInput.mockResolvedValue({
      payload: { type: 'clarification' },
      expired: false,
    });

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(intentGraphService.getPendingInput).toHaveBeenCalledWith(
      'conversation-1',
    );
    expect(intentGraphService.resume).toHaveBeenCalledWith(input);
    expect(intentGraphService.run).not.toHaveBeenCalled();
  });

  it('should start over when the pending question has expired', async () => {
    const { eventEmitter, intentGraphService } = await setup();
    intentGraphService.getPendingInput.mockResolvedValue({
      payload: { type: 'clarification' },
      expired: true,
    });

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(intentGraphService.resume).not.toHaveBeenCalled();
    expect(intentGraphService.run).toHaveBeenCalledWith(input);
  });

  it('should process an unrelated answer as a new request', async () => {
    const { eventEmitter, intentGraphService } = await setup();
    intentGraphService.getPendingInput.mockResolvedValue({
      payload: { type: 'confirmation' },
      expired: false,
    });
    intentGraphService.resume.mockResolvedValue(result('superseded'));

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();
    await flush();

    expect(intentGraphService.resume).toHaveBeenCalledWith(input);
    expect(intentGraphService.run).toHaveBeenCalledWith(input);
  });

  it('should not run the same conversation concurrently', async () => {
    const { eventEmitter, intentGraphService } = await setup();
    const running: string[] = [];
    let overlapped = false;
    intentGraphService.run.mockImplementation(async ({ messageId }) => {
      overlapped ||= running.length > 0;
      running.push(messageId);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running.pop();
      return result('no_intent');
    });

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    eventEmitter.emit(
      MESSAGE_CREATED_EVENT,
      new MessageCreatedEvent('message-2', 'conversation-1', 'client'),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(intentGraphService.run).toHaveBeenCalledTimes(2);
    expect(overlapped).toBe(false);
  });

  describe('debounce', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const send = (
      eventEmitter: EventEmitter2,
      messageId: string,
      conversationId = 'conversation-1',
    ) =>
      eventEmitter.emit(
        MESSAGE_CREATED_EVENT,
        new MessageCreatedEvent(messageId, conversationId, 'client'),
      );

    // Lets the async listener and the graph mocks settle under fake timers.
    const settle = async (ms: number) => {
      await jest.advanceTimersByTimeAsync(ms);
    };

    it('should process a burst of messages as one run', async () => {
      const { eventEmitter, intentGraphService } = await setup(true, 1500);

      send(eventEmitter, 'message-1');
      await settle(1000);
      send(eventEmitter, 'message-2');
      await settle(1000);
      send(eventEmitter, 'message-3');
      await settle(1000);

      expect(intentGraphService.run).not.toHaveBeenCalled();

      await settle(500);

      expect(intentGraphService.run).toHaveBeenCalledTimes(1);
      expect(intentGraphService.run).toHaveBeenCalledWith({
        messageId: 'message-3',
        conversationId: 'conversation-1',
        precedingMessageIds: ['message-1', 'message-2'],
      });
    });

    it('should debounce each conversation separately', async () => {
      const { eventEmitter, intentGraphService } = await setup(true, 1500);

      send(eventEmitter, 'message-1', 'conversation-1');
      send(eventEmitter, 'message-2', 'conversation-2');
      await settle(1500);

      expect(intentGraphService.run).toHaveBeenCalledTimes(2);
      expect(intentGraphService.run).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'message-2',
          conversationId: 'conversation-2',
          precedingMessageIds: [],
        }),
      );
    });

    it('should not wait longer than the max wait', async () => {
      const { eventEmitter, intentGraphService } = await setup(true, 1500);

      for (let i = 1; i <= 5; i++) {
        send(eventEmitter, `message-${i}`);
        await settle(1000);
      }

      // Fired 5000ms after the first message, although the client kept typing.
      expect(intentGraphService.run).toHaveBeenCalledTimes(1);
      expect(intentGraphService.run).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'message-5',
          precedingMessageIds: [
            'message-1',
            'message-2',
            'message-3',
            'message-4',
          ],
        }),
      );
    });

    it('should resume a paused run with the whole burst', async () => {
      const { eventEmitter, intentGraphService } = await setup(true, 1500);
      intentGraphService.getPendingInput.mockResolvedValue({
        payload: { type: 'clarification' },
        expired: false,
      });

      send(eventEmitter, 'message-1');
      send(eventEmitter, 'message-2');
      await settle(1500);

      expect(intentGraphService.resume).toHaveBeenCalledTimes(1);
      expect(intentGraphService.resume).toHaveBeenCalledWith({
        messageId: 'message-2',
        conversationId: 'conversation-1',
        precedingMessageIds: ['message-1'],
      });
      expect(intentGraphService.run).not.toHaveBeenCalled();
    });

    it('should process pending bursts on shutdown', async () => {
      const { eventEmitter, listener, intentGraphService } = await setup(
        true,
        1500,
      );

      send(eventEmitter, 'message-1');
      await settle(0);
      await listener.onModuleDestroy();

      expect(intentGraphService.run).toHaveBeenCalledTimes(1);

      // The cleared timer must not run it a second time.
      await settle(1500);
      expect(intentGraphService.run).toHaveBeenCalledTimes(1);
    });
  });

  it('should ignore non-client messages', async () => {
    const { eventEmitter, intentGraphService } = await setup();

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('agent'));
    await flush();

    expect(intentGraphService.run).not.toHaveBeenCalled();
  });

  it('should do nothing when disabled', async () => {
    const { eventEmitter, intentGraphService } = await setup(false);

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(intentGraphService.run).not.toHaveBeenCalled();
  });

  it('should swallow graph errors', async () => {
    const { eventEmitter, intentGraphService } = await setup();
    intentGraphService.run.mockRejectedValue(new Error('LLM down'));
    const onUnhandled = jest.fn();
    process.on('unhandledRejection', onUnhandled);

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();
    await flush();

    process.off('unhandledRejection', onUnhandled);
    expect(intentGraphService.run).toHaveBeenCalled();
    expect(onUnhandled).not.toHaveBeenCalled();
  });
});
