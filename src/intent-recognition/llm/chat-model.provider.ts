import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AllConfigType } from '../../config/config.type';

export const CHAT_MODEL = Symbol('CHAT_MODEL');

export const chatModelProvider: Provider<BaseChatModel | null> = {
  provide: CHAT_MODEL,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AllConfigType>) => {
    const config = configService.getOrThrow('intentRecognition', {
      infer: true,
    });

    // ChatAnthropic throws without an API key, so skip it when disabled.
    if (!config.enabled) {
      return null;
    }

    return new ChatAnthropic({
      model: config.model,
      apiKey: config.anthropicApiKey,
      temperature: 0,
      maxRetries: 2,
    });
  },
};
