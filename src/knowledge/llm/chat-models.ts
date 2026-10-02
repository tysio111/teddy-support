import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { Runnable } from '@langchain/core/runnables';
import { z } from 'zod';
import {
  isAdaptiveOnlyModel,
  samplingOptions,
  structuredOutputMethod,
} from '../../utils/anthropic-models';
import { KnowledgeConfig } from '../config/knowledge-config.type';

export type KnowledgeChatModels = {
  // Query rewriting, HyDE, reranking, chunk context.
  fast: BaseChatModel;
  answer: BaseChatModel;
};

export function createKnowledgeChatModels(
  config: KnowledgeConfig,
): KnowledgeChatModels | null {
  // ChatAnthropic throws without an API key, so fail on use instead of boot.
  if (!config.anthropicApiKey) {
    return null;
  }

  return {
    fast: new ChatAnthropic({
      model: config.fastModel,
      apiKey: config.anthropicApiKey,
      ...samplingOptions(config.fastModel),
      maxTokens: 2000,
      // Transport-level retries; callers (graph nodes) add their own.
      maxRetries: 1,
    }),
    answer: new ChatAnthropic({
      model: config.answerModel,
      apiKey: config.anthropicApiKey,
      maxTokens: config.answerMaxTokens,
      ...(isAdaptiveOnlyModel(config.answerModel)
        ? { outputConfig: { effort: config.answerEffort } }
        : { temperature: 0 }),
      maxRetries: 1,
    }),
  };
}

export function withStructuredOutput<T extends Record<string, any>>(
  model: BaseChatModel,
  schema: z.ZodType<T>,
  name: string,
): Runnable<BaseLanguageModelInput, T> {
  const modelName = (model as ChatAnthropic).model ?? '';
  return model.withStructuredOutput<T>(schema, {
    name,
    method: structuredOutputMethod(modelName),
  });
}
