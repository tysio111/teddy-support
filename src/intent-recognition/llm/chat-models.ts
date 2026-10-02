import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { samplingOptions } from '../../utils/anthropic-models';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';

export type ChatModels = {
  primary: BaseChatModel;
  // Used when the primary model fails (outage, overload, bad output).
  fallback: BaseChatModel | null;
};

export function createChatModels(
  config: IntentRecognitionConfig,
): ChatModels | null {
  // ChatAnthropic throws without an API key, so skip it when disabled.
  if (!config.enabled) {
    return null;
  }

  const createModel = (model: string) =>
    new ChatAnthropic({
      model,
      apiKey: config.anthropicApiKey,
      ...samplingOptions(model),
      // Transport-level retries (429/5xx). Graph nodes add their own retry
      // policy on top, so keep this low to avoid multiplying attempts.
      maxRetries: 1,
    });

  return {
    primary: createModel(config.model),
    fallback: config.fallbackModel ? createModel(config.fallbackModel) : null,
  };
}
