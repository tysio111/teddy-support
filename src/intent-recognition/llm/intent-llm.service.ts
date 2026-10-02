import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { z } from 'zod';
import { Action } from '../../actions/domain/action';
import { ActionParameter } from '../../action-parameters/domain/action-parameter';
import { Message } from '../../messages/domain/message';
import { structuredOutputMethod } from '../../utils/anthropic-models';
import {
  CatalogAction,
  ExtractedParameters,
  GuardrailVerdictEnum,
  IntentCandidate,
  ParameterIssue,
} from '../intent-recognition.types';
import {
  buildClassificationPrompt,
  CLASSIFICATION_SYSTEM_PROMPT,
} from '../prompts/classification.prompt';
import {
  buildExtractionPrompt,
  buildRepairPrompt,
  EXTRACTION_SYSTEM_PROMPT,
  REPAIR_SYSTEM_PROMPT,
} from '../prompts/extraction.prompt';
import {
  buildGuardrailPrompt,
  GUARDRAIL_SYSTEM_PROMPT,
} from '../prompts/guardrail.prompt';
import {
  buildResponsePrompt,
  RESPONSE_SYSTEM_PROMPT,
} from '../prompts/response.prompt';
import { ChatModels } from './chat-models';
import { buildParameterSchema } from './parameter-schema';

const classificationSchema = z.object({
  intents: z
    .array(
      z.object({
        actionId: z.string().describe('The id of an action from the catalog'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('Confidence that the client wants this action now'),
        reasoning: z.string().describe('One short sentence of justification'),
      }),
    )
    .describe('Candidate actions, most likely first. Empty if none match.'),
});

const guardrailSchema = z.object({
  verdict: z.enum(GuardrailVerdictEnum),
});

const replySchema = z.object({
  reply: z.string().describe('The message to send to the customer'),
});

export class IntentLlmService {
  constructor(private readonly models: ChatModels | null) {}

  async screenMessage(content: string): Promise<GuardrailVerdictEnum> {
    const result = await this.structured(
      guardrailSchema,
      'screen_message',
    ).invoke([
      new SystemMessage(GUARDRAIL_SYSTEM_PROMPT),
      new HumanMessage(buildGuardrailPrompt(content)),
    ]);

    return result.verdict;
  }

  async classify(input: {
    history: Message[];
    message: Message;
    catalog: CatalogAction[];
    maxCandidates: number;
  }): Promise<IntentCandidate[]> {
    const result = await this.structured(
      classificationSchema,
      'classify_intents',
    ).invoke([
      new SystemMessage(CLASSIFICATION_SYSTEM_PROMPT),
      new HumanMessage(buildClassificationPrompt(input)),
    ]);

    return result.intents;
  }

  async extractParameters(input: {
    history: Message[];
    action: Action;
    parameters: ActionParameter[];
  }): Promise<ExtractedParameters> {
    if (!input.parameters.length) {
      return {};
    }

    return this.structured(
      buildParameterSchema(input.parameters),
      'extract_parameters',
    ).invoke([
      new SystemMessage(EXTRACTION_SYSTEM_PROMPT),
      new HumanMessage(buildExtractionPrompt(input)),
    ]);
  }

  // Self-correction: re-extract with the validation errors of the previous
  // attempt in the prompt.
  async repairParameters(input: {
    history: Message[];
    action: Action;
    parameters: ActionParameter[];
    previousValues: ExtractedParameters;
    issues: ParameterIssue[];
  }): Promise<ExtractedParameters> {
    return this.structured(
      buildParameterSchema(input.parameters),
      'extract_parameters',
    ).invoke([
      new SystemMessage(REPAIR_SYSTEM_PROMPT),
      new HumanMessage(buildRepairPrompt(input)),
    ]);
  }

  async generateReply(input: {
    action: Action;
    parameters: ExtractedParameters;
    responsePayload: string | null;
  }): Promise<string> {
    const result = await this.structured(replySchema, 'reply').invoke([
      new SystemMessage(RESPONSE_SYSTEM_PROMPT),
      new HumanMessage(buildResponsePrompt(input)),
    ]);

    return result.reply;
  }

  // Structured output must be bound per model before chaining fallbacks:
  // `withFallbacks` returns a plain Runnable without `withStructuredOutput`.
  private structured<T extends Record<string, any>>(
    schema: z.ZodType<T>,
    name: string,
  ): Runnable<BaseLanguageModelInput, T> {
    const { primary, fallback } = this.getModels();
    const bind = (model: BaseChatModel) =>
      model.withStructuredOutput<T>(schema, {
        name,
        method: structuredOutputMethod((model as ChatAnthropic).model ?? ''),
      });

    return fallback
      ? bind(primary).withFallbacks([bind(fallback)])
      : bind(primary);
  }

  private getModels(): ChatModels {
    if (!this.models) {
      throw new Error(
        'Intent recognition is disabled (INTENT_RECOGNITION_ENABLED=false)',
      );
    }

    return this.models;
  }
}
