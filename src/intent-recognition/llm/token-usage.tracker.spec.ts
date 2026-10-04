import { AIMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';
import { TokenUsageTracker } from './token-usage.tracker';

const result = (
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheRead = 0,
): LLMResult => ({
  generations: [
    [
      {
        text: '',
        message: new AIMessage({
          content: '',
          response_metadata: { model },
          usage_metadata: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
            input_token_details: { cache_read: cacheRead },
          },
        }),
      } as LLMResult['generations'][number][number],
    ],
  ],
});

describe('TokenUsageTracker', () => {
  it('should sum tokens and price each call by its model', () => {
    const tracker = new TokenUsageTracker();

    tracker.handleLLMEnd(result('claude-haiku-4-5-20251001', 1000, 100));
    tracker.handleLLMEnd(result('claude-opus-5-5', 2000, 200, 1000));

    expect(tracker.usage).toEqual({
      llmCalls: 2,
      inputTokens: 3000,
      outputTokens: 300,
      costUsd: expect.any(Number),
    });
    // Haiku: 1000 * $1 + 100 * $5; Opus 5.5: 1000 * $4 + 1000 * $0.4 + 200 * $20
    expect(tracker.usage.costUsd).toBeCloseTo(
      (1000 + 500 + 4000 + 400 + 4000) / 1_000_000,
    );
  });

  it('should skip generations without usage', () => {
    const tracker = new TokenUsageTracker();

    tracker.handleLLMEnd({
      generations: [[{ text: '', message: new AIMessage('hi') } as never]],
    });

    expect(tracker.usage.llmCalls).toBe(0);
  });
});
