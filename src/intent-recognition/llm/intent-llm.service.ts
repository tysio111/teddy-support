import { Inject, Injectable } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { Action } from '../../actions/domain/action';
import { ActionParameter } from '../../action-parameters/domain/action-parameter';
import { Message } from '../../messages/domain/message';
import {
  CatalogAction,
  ExtractedParameters,
  IntentCandidate,
} from '../intent-recognition.types';
import {
  buildClassificationPrompt,
  CLASSIFICATION_SYSTEM_PROMPT,
} from '../prompts/classification.prompt';
import {
  buildExtractionPrompt,
  EXTRACTION_SYSTEM_PROMPT,
} from '../prompts/extraction.prompt';
import { CHAT_MODEL } from './chat-model.provider';
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

@Injectable()
export class IntentLlmService {
  constructor(
    @Inject(CHAT_MODEL) private readonly model: BaseChatModel | null,
  ) {}

  async classify(input: {
    history: Message[];
    message: Message;
    catalog: CatalogAction[];
    maxCandidates: number;
  }): Promise<IntentCandidate[]> {
    const result = await this.getModel()
      .withStructuredOutput(classificationSchema, {
        name: 'classify_intents',
      })
      .invoke([
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

    return this.getModel()
      .withStructuredOutput(buildParameterSchema(input.parameters), {
        name: 'extract_parameters',
      })
      .invoke([
        new SystemMessage(EXTRACTION_SYSTEM_PROMPT),
        new HumanMessage(buildExtractionPrompt(input)),
      ]);
  }

  private getModel(): BaseChatModel {
    if (!this.model) {
      throw new Error(
        'Intent recognition is disabled (INTENT_RECOGNITION_ENABLED=false)',
      );
    }

    return this.model;
  }
}
