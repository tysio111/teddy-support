import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { ActionAuthTypeEnum } from '../actions/action-auth-type.enum';
import {
  samplingOptions,
  structuredOutputMethod,
} from '../utils/anthropic-models';
import { DocExtractionConfig } from './config/doc-extraction-config.type';
import { DocumentContent } from './document-input';
import {
  ACTION_EXTRACTION_SYSTEM_PROMPT,
  ACTION_EXTRACTION_USER_PROMPT,
} from './prompts/action-extraction.prompt';

const extractedActionsSchema = z.object({
  actions: z.array(
    z.object({
      name: z.string().describe('Short snake_case identifier'),
      description: z
        .string()
        .describe('What the endpoint does and when a customer needs it'),
      httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      endpointUrl: z
        .string()
        .describe('Full URL, or path if no base URL is given'),
      authType: z.enum(
        Object.values(ActionAuthTypeEnum) as [string, ...string[]],
      ),
      requiresConfirmation: z
        .boolean()
        .describe('True if the endpoint changes data or spends money'),
      parameters: z.array(
        z.object({
          name: z.string().describe('Exactly as in the API'),
          type: z.enum(['string', 'number', 'integer', 'boolean']),
          description: z.string(),
          isRequired: z.boolean(),
          enumValues: z
            .array(z.string())
            .nullable()
            .describe('Allowed values, only if the document lists them'),
        }),
      ),
    }),
  ),
});

export type ExtractedAction = z.infer<
  typeof extractedActionsSchema
>['actions'][number];

export class ActionExtractor {
  constructor(private readonly model: BaseChatModel | null) {}

  async extract(document: DocumentContent): Promise<ExtractedAction[]> {
    if (!this.model) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const result = await this.model
      .withStructuredOutput(extractedActionsSchema, {
        name: 'save_actions',
        method: structuredOutputMethod(
          (this.model as ChatAnthropic).model ?? '',
        ),
      })
      .invoke([
        new SystemMessage(ACTION_EXTRACTION_SYSTEM_PROMPT),
        new HumanMessage({
          content: [
            ...document,
            { type: 'text', text: ACTION_EXTRACTION_USER_PROMPT },
          ],
        }),
      ]);

    return result.actions;
  }
}

export function createActionExtractor(
  config: DocExtractionConfig,
): ActionExtractor {
  // ChatAnthropic throws without an API key, so fail on use instead of boot.
  if (!config.anthropicApiKey) {
    return new ActionExtractor(null);
  }

  return new ActionExtractor(
    new ChatAnthropic({
      model: config.model,
      apiKey: config.anthropicApiKey,
      ...samplingOptions(config.model),
      maxTokens: config.maxTokens,
      maxRetries: 2,
    }),
  );
}
