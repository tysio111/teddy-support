import { Logger } from '@nestjs/common';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { AIMessage } from '@langchain/core/messages';
import { ChatGeneration, LLMResult } from '@langchain/core/outputs';
import { estimateCostUsd, isPricedModel } from '../../utils/anthropic-models';

export type TokenUsage = {
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  // Estimated from the model that served each call (see anthropic-models.ts).
  costUsd: number;
};

export const emptyTokenUsage = (): TokenUsage => ({
  llmCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
});

const warnedModels = new Set<string>();

/**
 * Sums token usage and estimated cost across every LLM call of one graph run,
 * including calls served by the fallback model and knowledge base calls made
 * inside graph nodes. Pass a fresh instance per run via `config.callbacks`;
 * LangChain propagates it into nested runnables.
 */
export class TokenUsageTracker extends BaseCallbackHandler {
  name = 'token_usage_tracker';

  private readonly logger = new Logger(TokenUsageTracker.name);

  readonly usage: TokenUsage = emptyTokenUsage();

  handleLLMEnd(output: LLMResult): void {
    for (const generation of output.generations.flat()) {
      const message = (generation as ChatGeneration).message as
        | AIMessage
        | undefined;
      const usage = message?.usage_metadata;
      if (!usage) {
        continue;
      }

      const model = this.modelOf(message, output);
      this.usage.llmCalls += 1;
      this.usage.inputTokens += usage.input_tokens;
      this.usage.outputTokens += usage.output_tokens;
      this.usage.costUsd += estimateCostUsd(model, {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.input_token_details?.cache_read,
        cacheWriteTokens: usage.input_token_details?.cache_creation,
      });
    }
  }

  // Anthropic echoes the model in the response; streamed messages carry it in
  // `additional_kwargs` instead.
  private modelOf(message: AIMessage, output: LLMResult): string {
    const model =
      [
        message.response_metadata?.model,
        message.additional_kwargs?.model,
        output.llmOutput?.model,
      ].find((value): value is string => typeof value === 'string') ?? '';

    if (!isPricedModel(model) && !warnedModels.has(model)) {
      warnedModels.add(model);
      this.logger.warn(
        `No price for model "${model}": cost estimated at the top tier`,
      );
    }

    return model;
  }
}
