import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { Message } from '../../messages/domain/message';
import { PiiRedactor } from '../../privacy/pii/pii-redactor';
import {
  samplingOptions,
  structuredOutputMethod,
} from '../../utils/anthropic-models';
import { HandoffConfig } from '../config/handoff-config.type';
import { HandoffSentimentEnum, HandoffSummary } from '../handoffs.types';
import {
  buildSummaryPrompt,
  SUMMARY_SYSTEM_PROMPT,
} from '../prompts/summary.prompt';

const summarySchema = z.object({
  summary: z.string(),
  clientGoal: z.string(),
  attempted: z.array(z.string()),
  openQuestions: z.array(z.string()),
  suggestedNextStep: z.string(),
  sentiment: z.enum(HandoffSentimentEnum),
  language: z.string(),
});

export class HandoffLlmService {
  private readonly model: ChatAnthropic | null;

  constructor(
    config: HandoffConfig,
    private readonly redactor = new PiiRedactor(),
  ) {
    // ChatAnthropic throws without an API key, so fail on use instead of boot.
    this.model = config.anthropicApiKey
      ? new ChatAnthropic({
          model: config.summaryModel,
          apiKey: config.anthropicApiKey,
          ...samplingOptions(config.summaryModel),
          maxTokens: 1000,
          maxRetries: 2,
        })
      : null;
  }

  summarize(input: {
    history: Message[];
    reason: string;
    context: string | null;
  }): Promise<HandoffSummary> {
    if (!this.model) {
      throw new Error('Hand-off summary needs ANTHROPIC_API_KEY');
    }

    // The agent reading the summary sees the transcript too, so placeholders
    // are restored rather than left in.
    return this.redactor
      .wrap(
        this.model.withStructuredOutput<HandoffSummary>(summarySchema, {
          name: 'handoff_summary',
          method: structuredOutputMethod(this.model.model),
        }),
      )
      .invoke([
        new SystemMessage(SUMMARY_SYSTEM_PROMPT),
        new HumanMessage(buildSummaryPrompt(input)),
      ]);
  }
}
