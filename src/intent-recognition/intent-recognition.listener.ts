import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { AllConfigType } from '../config/config.type';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '../messages/events/message-created.event';
import { MessageSenderEnum } from '../messages/message-sender.enum';
import {
  IntentGraphInput,
  IntentGraphRunResult,
  IntentGraphService,
} from './graph/intent-graph.service';
import { IntentOutcomeEnum } from './intent-recognition.types';

@Injectable()
export class IntentRecognitionListener {
  private readonly logger = new Logger(IntentRecognitionListener.name);

  // Runs of one conversation share a checkpoint thread, so they must not
  // overlap. In-process only: multiple instances would need a distributed
  // lock (e.g. a Postgres advisory lock) or a queue partitioned by
  // conversation.
  private readonly conversationLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly intentGraphService: IntentGraphService,
  ) {}

  // Fire-and-forget: runs after the HTTP response and must never throw.
  @OnEvent(MESSAGE_CREATED_EVENT, { async: true })
  async handleMessageCreated(event: MessageCreatedEvent): Promise<void> {
    if (
      event.sender !== MessageSenderEnum.client ||
      !this.configService.get('intentRecognition.enabled', { infer: true })
    ) {
      return;
    }

    await this.withConversationLock(event.conversationId, () =>
      this.process({
        messageId: event.messageId,
        conversationId: event.conversationId,
      }),
    );
  }

  private async process(input: IntentGraphInput): Promise<void> {
    try {
      const pending = await this.intentGraphService.getPendingInput(
        input.conversationId,
      );

      let result: IntentGraphRunResult;
      if (pending && !pending.expired) {
        // The client is answering a question we asked: continue that run.
        result = await this.intentGraphService.resume(input);
        if (result.outcome === IntentOutcomeEnum.superseded) {
          // They moved on to something else instead: treat it as new.
          result = await this.intentGraphService.run(input);
        }
      } else {
        result = await this.intentGraphService.run(input);
      }

      this.log(input, result);
    } catch (error) {
      this.logger.error(
        `Intent recognition failed for message ${input.messageId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private log(input: IntentGraphInput, result: IntentGraphRunResult): void {
    const totalMs = result.metrics.reduce((sum, { ms }) => sum + ms, 0);
    const status = result.pendingInput
      ? `waiting for ${result.pendingInput.type}`
      : result.outcome;

    this.logger.log(
      `Message ${input.messageId}: ${status}` +
        (result.escalated ? ' (escalated)' : '') +
        (result.topIntent ? ` (detectedIntent ${result.topIntent.id})` : '') +
        ` [${totalMs}ms, ${result.usage.llmCalls} LLM calls, ` +
        `${result.usage.inputTokens}/${result.usage.outputTokens} tokens in/out]`,
    );
  }

  private async withConversationLock(
    conversationId: string,
    task: () => Promise<void>,
  ): Promise<void> {
    const previous =
      this.conversationLocks.get(conversationId) ?? Promise.resolve();
    const current = previous.then(task);
    this.conversationLocks.set(conversationId, current);

    try {
      await current;
    } finally {
      // Only the last queued task cleans up, so the map does not grow.
      if (this.conversationLocks.get(conversationId) === current) {
        this.conversationLocks.delete(conversationId);
      }
    }
  }
}
