import { Logger } from '@nestjs/common';
import { BaseCheckpointSaver, Command, Interrupt } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Message } from '../../messages/domain/message';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';
import { TokenUsage, TokenUsageTracker } from '../llm/token-usage.tracker';
import { InterruptPayload, ResumeValue } from '../intent-recognition.types';
import { IntentGraph } from './intent-graph';
import {
  freshRunInput,
  IntentGraphStateType,
  IntentGraphUpdate,
} from './intent-graph.state';

export type IntentGraphInput = {
  // The latest message; detected intents are linked to it.
  messageId: Message['id'];
  conversationId: string;
  // Earlier messages of the same burst (see the listener's debounce), oldest
  // first. They are processed together with `messageId` as one message.
  precedingMessageIds?: Message['id'][];
};

export type IntentGraphRunResult = IntentGraphStateType & {
  usage: TokenUsage;
  // Set when the run paused to wait for the client (human-in-the-loop).
  pendingInput: InterruptPayload | null;
};

export type PendingInput = {
  payload: InterruptPayload;
  expired: boolean;
};

// Hard stop for cycles (repair, clarification, execution retries).
const RECURSION_LIMIT = 60;

// Runs the intent graph (built in intent-graph.ts) for one message: fresh runs,
// resuming a paused run, and inspecting its checkpointed state.
export class IntentGraphService {
  private readonly logger = new Logger(IntentGraphService.name);

  constructor(
    private readonly graph: IntentGraph,
    private readonly checkpointer: BaseCheckpointSaver,
    private readonly config: IntentRecognitionConfig,
  ) {}

  // Releases the Postgres pool, if any. Called on module shutdown.
  async close(): Promise<void> {
    if (this.checkpointer instanceof PostgresSaver) {
      await this.checkpointer.end();
    }
  }

  run(input: IntentGraphInput): Promise<IntentGraphRunResult> {
    return this.execute(freshRunInput(input), input);
  }

  // Continues a paused run with the client's reply.
  resume(input: IntentGraphInput): Promise<IntentGraphRunResult> {
    return this.execute(
      new Command<ResumeValue, IntentGraphUpdate, never>({
        resume: {
          messageId: input.messageId,
          precedingMessageIds: input.precedingMessageIds,
        },
      }),
      input,
    );
  }

  async getPendingInput(conversationId: string): Promise<PendingInput | null> {
    const snapshot = await this.graph.getState(
      this.threadConfig(conversationId),
    );
    const pending = snapshot.tasks.flatMap((task) => task.interrupts)[0];
    if (!pending) {
      return null;
    }

    const pausedAt = snapshot.createdAt
      ? Date.parse(snapshot.createdAt)
      : Date.now();

    return {
      payload: pending.value as InterruptPayload,
      expired: Date.now() - pausedAt > this.config.pendingInputTtlMs,
    };
  }

  // Drops the conversation's checkpoints, which hold its messages.
  deleteThread(conversationId: string): Promise<void> {
    return this.checkpointer.deleteThread(conversationId);
  }

  async drawMermaid(): Promise<string> {
    return (await this.graph.getGraphAsync()).drawMermaid();
  }

  private async execute(
    input: IntentGraphUpdate | Command<ResumeValue, IntentGraphUpdate, never>,
    meta: IntentGraphInput,
  ): Promise<IntentGraphRunResult> {
    const tracker = new TokenUsageTracker();
    const stream = await this.graph.stream(input, {
      ...this.threadConfig(meta.conversationId),
      streamMode: ['updates', 'values'],
      recursionLimit: RECURSION_LIMIT,
      callbacks: [tracker],
      // Picked up by LangSmith when LANGSMITH_TRACING=true.
      runName: 'intent-recognition',
      metadata: {
        messageId: meta.messageId,
        conversationId: meta.conversationId,
      },
    });

    let state: IntentGraphStateType | undefined;
    let pendingInput: InterruptPayload | null = null;

    for await (const [mode, chunk] of stream) {
      if (mode === 'values') {
        // On interrupt, the last "values" chunk carries only `__interrupt__`.
        if (!('__interrupt__' in (chunk as object))) {
          state = chunk as IntentGraphStateType;
        }
        continue;
      }

      for (const [node, update] of Object.entries(
        chunk as Record<string, unknown>,
      )) {
        if (node === '__interrupt__') {
          pendingInput =
            ((update as Interrupt[])[0]?.value as InterruptPayload) ?? null;
        } else {
          this.logger.debug(`[message ${meta.messageId}] ${node} done`);
        }
      }
    }

    return { ...state!, usage: tracker.usage, pendingInput };
  }

  private threadConfig(conversationId: string) {
    // One thread per conversation: a paused run is resumed by the next client
    // message in the same conversation.
    return { configurable: { thread_id: conversationId } };
  }
}
