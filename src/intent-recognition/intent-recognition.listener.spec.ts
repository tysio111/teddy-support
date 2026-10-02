import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '../messages/events/message-created.event';
import { IntentGraphService } from './graph/intent-graph.service';
import { IntentRecognitionListener } from './intent-recognition.listener';

describe('IntentRecognitionListener', () => {
  async function setup(enabled = true) {
    const intentGraphService = {
      run: jest.fn().mockResolvedValue({ outcome: 'no_intent' }),
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

  const event = (sender: string) =>
    new MessageCreatedEvent('message-1', 'conversation-1', 'company-1', sender);

  it('should run the intent graph for client messages', async () => {
    const { eventEmitter, intentGraphService } = await setup();

    eventEmitter.emit(MESSAGE_CREATED_EVENT, event('client'));
    await flush();

    expect(intentGraphService.run).toHaveBeenCalledWith({
      messageId: 'message-1',
      companyId: 'company-1',
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
