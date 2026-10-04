import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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

type Burst = {
  messageIds: string[];
  firstAt: number;
  timer: NodeJS.Timeout;
};

@Injectable()
export class IntentRecognitionListener implements OnModuleDestroy {
  private readonly logger = new Logger(IntentRecognitionListener.name);

  // Runs of one conversation share a checkpoint thread, so they must not
  // overlap. In-process only (as is the debounce below): multiple instances
  // would need a distributed lock (e.g. a Postgres advisory lock) or a queue
  // partitioned by conversation.
  private readonly conversationLocks = new Map<string, Promise<void>>();

  // Clients often split one request ("hi", "my order", "ORD-1"). Messages
  // arriving within `debounceMs` of each other are processed as one run.
  private readonly bursts = new Map<string, Burst>();

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

    if (
      !this.configService.get('intentRecognition.debounceMs', { infer: true })
    ) {
      await this.processBurst(event.conversationId, [event.messageId]);
      return;
    }

    this.debounce(event.conversationId, event.messageId);
  }

  // Processes pending bursts right away, so a graceful shutdown does not
  // drop them.
  async onModuleDestroy(): Promise<void> {
    const pending = [...this.bursts.entries()];
    this.bursts.clear();

    await Promise.all(
      pending.map(([conversationId, burst]) => {
        clearTimeout(burst.timer);
        return this.processBurst(conversationId, burst.messageIds);
      }),
    );
  }

  // Runs (or resumes) the graph for a client message. Public so tools like the
  // chat script can drive the same flow without the event; throws on failure.
  recognize(input: IntentGraphInput): Promise<IntentGraphRunResult> {
    return this.withConversationLock(input.conversationId, () =>
      this.process(input),
    );
  }

  // Restarts the conversation's timer on every message, but never waits more
  // than `debounceMaxWaitMs` from the first one.
  private debounce(conversationId: string, messageId: string): void {
    const debounceMs = this.configService.getOrThrow(
      'intentRecognition.debounceMs',
      { infer: true },
    );
    const maxWaitMs = this.configService.getOrThrow(
      'intentRecognition.debounceMaxWaitMs',
      { infer: true },
    );

    const now = Date.now();
    const burst = this.bursts.get(conversationId);
    if (burst) {
      clearTimeout(burst.timer);
      burst.messageIds.push(messageId);
    }
    const firstAt = burst?.firstAt ?? now;
    const messageIds = burst?.messageIds ?? [messageId];

    const timer = setTimeout(
      () => {
        this.bursts.delete(conversationId);
        void this.processBurst(conversationId, messageIds);
      },
      Math.max(0, Math.min(debounceMs, firstAt + maxWaitMs - now)),
    );
    this.bursts.set(conversationId, { messageIds, firstAt, timer });
  }

  // Must never throw: it runs detached from the event.
  private async processBurst(
    conversationId: string,
    messageIds: string[],
  ): Promise<void> {
    const input: IntentGraphInput = {
      messageId: messageIds[messageIds.length - 1],
      conversationId,
      precedingMessageIds: messageIds.slice(0, -1),
    };

    try {
      this.log(input, await this.recognize(input));
    } catch (error) {
      this.logger.error(
        `Intent recognition failed for message ${input.messageId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async process(
    input: IntentGraphInput,
  ): Promise<IntentGraphRunResult> {
    const pending = await this.intentGraphService.getPendingInput(
      input.conversationId,
    );

    if (pending && !pending.expired) {
      // The client is answering a question we asked: continue that run.
      const result = await this.intentGraphService.resume(input);
      if (result.outcome !== IntentOutcomeEnum.superseded) {
        return result;
      }
      // They moved on to something else instead: treat it as new.
    }

    return this.intentGraphService.run(input);
  }

  private log(input: IntentGraphInput, result: IntentGraphRunResult): void {
    const totalMs = result.metrics.reduce((sum, { ms }) => sum + ms, 0);
    const status = result.pendingInput
      ? `waiting for ${result.pendingInput.type}`
      : result.outcome;

    const burst = input.precedingMessageIds?.length
      ? ` (with ${input.precedingMessageIds.length} earlier)`
      : '';

    this.logger.log(
      `Message ${input.messageId}${burst}: ${status}` +
        (result.escalated ? ' (escalated)' : '') +
        (result.topIntent ? ` (detectedIntent ${result.topIntent.id})` : '') +
        ` [${totalMs}ms, ${result.usage.llmCalls} LLM calls, ` +
        `${result.usage.inputTokens}/${result.usage.outputTokens} tokens in/out]`,
    );
  }

  private async withConversationLock<T>(
    conversationId: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const previous =
      this.conversationLocks.get(conversationId) ?? Promise.resolve();
    const current = previous.then(task);
    // Later tasks wait for this one, but must not inherit its failure.
    const settled = current.then(
      () => undefined,
      () => undefined,
    );
    this.conversationLocks.set(conversationId, settled);

    try {
      return await current;
    } finally {
      // Only the last queued task cleans up, so the map does not grow.
      if (this.conversationLocks.get(conversationId) === settled) {
        this.conversationLocks.delete(conversationId);
      }
    }
  }
}
