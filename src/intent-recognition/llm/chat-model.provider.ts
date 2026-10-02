import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AllConfigType } from '../../config/config.type';

export const CHAT_MODELS = Symbol('CHAT_MODELS');

export type ChatModels = {
  primary: BaseChatModel;
  // Used when the primary model fails (outage, overload, bad output).
  fallback: BaseChatModel | null;
};

export const chatModelProvider: Provider<ChatModels | null> = {
  provide: CHAT_MODELS,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AllConfigType>) => {
    const config = configService.getOrThrow('intentRecognition', {
      infer: true,
    });

    // ChatAnthropic throws without an API key, so skip it when disabled.
    if (!config.enabled) {
      return null;
    }

    const createModel = (model: string) =>
      new ChatAnthropic({
        model,
        apiKey: config.anthropicApiKey,
        temperature: 0,
        // Transport-level retries (429/5xx). Graph nodes add their own retry
        // policy on top, so keep this low to avoid multiplying attempts.
        maxRetries: 1,
      });

    return {
      primary: createModel(config.model),
      fallback: config.fallbackModel ? createModel(config.fallbackModel) : null,
    };
  },
};
