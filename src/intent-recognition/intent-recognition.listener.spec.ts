import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '../messages/events/message-created.event';
import { IntentGraphService } from './graph/intent-graph.service';
import { IntentRecognitionListener } from './intent-recognition.listener';

const result = (outcome: string) => ({
  outcome,
  metrics: [],
  escalated: false,
  pendingInput: null,
  usage: { llmCalls: 0, inputTokens: 0, outputTokens: 0 },
});

describe('IntentRecognitionListener', () => {
  async function setup(enabled = true) {
    const intentGraphService = {
      run: jest.fn().mockResolvedValue(result('no_intent')),
      resume: jest.fn().mockResolvedValue(result('executed')),
      getPendingInput: jest.fn().mockResolvedValue(null),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        IntentRecognitionListener,
        { provide: IntentGraphService, useValue: intentGraphService },
        { provide: ConfigService, useValue: { get: () => enabled } },
      ],
    }).compile();
    await moduleRef.init();

    return {
      eventEmitter: moduleRef.get(EventEmitter2),
      intentGraphService,
    };
  }

  // `async: true` listeners run on a later tick, after emit returns.
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  const input = {
    messageId: 'message-1',
    companyId: 'company-1',
    conversationId: 'conversation-1',
  };

  const event = (sender: string) =>
    new MessageCreatedEvent('message-1', 'conversation-1', 'company-1', sender);

  it('should run the intent graph for client messages', async () => {
    const { eventEmitter, intentGraphService } = await setup();

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(intentGraphService.run).toHaveBeenCalledWith(input);
    expect(intentGraphService.resume).not.toHaveBeenCalled();
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
      new MessageCreatedEvent(
        'message-2',
        'conversation-1',
        'company-1',
        'client',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(intentGraphService.run).toHaveBeenCalledTimes(2);
    expect(overlapped).toBe(false);
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
