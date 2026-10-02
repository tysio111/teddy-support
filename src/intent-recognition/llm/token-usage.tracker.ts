import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { AIMessage } from '@langchain/core/messages';
import { ChatGeneration, LLMResult } from '@langchain/core/outputs';

export type TokenUsage = {
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Sums token usage across every LLM call of one graph run, including calls
 * served by the fallback model. Pass a fresh instance per run via
 * `config.callbacks`; LangChain propagates it into nested runnables.
 */
export class TokenUsageTracker extends BaseCallbackHandler {
  name = 'token_usage_tracker';

  readonly usage: TokenUsage = { llmCalls: 0, inputTokens: 0, outputTokens: 0 };

  handleLLMEnd(output: LLMResult): void {
    for (const generation of output.generations.flat()) {
      const message = (generation as ChatGeneration).message as
        | AIMessage
        | undefined;
      const usage = message?.usage_metadata;
      if (usage) {
        this.usage.llmCalls += 1;
        this.usage.inputTokens += usage.input_tokens;
        this.usage.outputTokens += usage.output_tokens;
      }
    }
  }
}
