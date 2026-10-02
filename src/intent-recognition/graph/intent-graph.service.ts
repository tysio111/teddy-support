import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { END, START, StateGraph } from '@langchain/langgraph';
import { AllConfigType } from '../../config/config.type';
import { Action } from '../../actions/domain/action';
import { ActionsService } from '../../actions/actions.service';
import { ActionParametersService } from '../../action-parameters/action-parameters.service';
import { ActionExecutionsService } from '../../action-executions/action-executions.service';
import { ActionExecutionStatusEnum } from '../../action-executions/action-execution-status.enum';
import { Company } from '../../companies/domain/company';
import { DetectedIntentsService } from '../../detected-intents/detected-intents.service';
import { DetectedIntentStatusEnum } from '../../detected-intents/detected-intent-status.enum';
import { MessagesService } from '../../messages/messages.service';
import { ActionExecutorService } from '../execution/action-executor.service';
import { IntentLlmService } from '../llm/intent-llm.service';
import {
  IntentCandidate,
  IntentOutcomeEnum,
} from '../intent-recognition.types';
import {
  IntentGraphState,
  IntentGraphStateType,
  IntentGraphUpdate,
} from './intent-graph.state';

export function resolveConfidenceThreshold(
  action: Action,
  company: Company | undefined,
  defaultThreshold: number,
): number {
  return (
    action.confidenceThreshold ??
    company?.confidenceThreshold ??
    defaultThreshold
  );
}

// Keeps only catalog actions (guards against hallucinated ids), one entry per
// action, highest confidence first.
export function normalizeCandidates(
  candidates: IntentCandidate[],
  catalogIds: Set<string>,
  maxCandidates: number,
): IntentCandidate[] {
  const seen = new Set<string>();

  return [...candidates]
    .sort((a, b) => b.confidence - a.confidence)
    .filter((candidate) => {
      if (!catalogIds.has(candidate.actionId) || seen.has(candidate.actionId)) {
        return false;
      }
      seen.add(candidate.actionId);
      return true;
    })
    .slice(0, maxCandidates);
}

/**
 * START → loadContext → classifyIntent → persistIntents → extractParameters
 *       → executeAction → recordExecution → END
 *
 * Any node may set `outcome` to end the run early.
 */
@Injectable()
export class IntentGraphService {
  private readonly graph = new StateGraph(IntentGraphState)
    .addNode('loadContext', (state) => this.loadContext(state))
    .addNode('classifyIntent', (state) => this.classifyIntent(state))
    .addNode('persistIntents', (state) => this.persistIntents(state))
    .addNode('extractParameters', (state) => this.extractParameters(state))
    .addNode('executeAction', (state) => this.executeAction(state))
    .addNode('recordExecution', (state) => this.recordExecution(state))
    .addEdge(START, 'loadContext')
    .addConditionalEdges('loadContext', this.continueOrEnd('classifyIntent'))
    .addConditionalEdges('classifyIntent', this.continueOrEnd('persistIntents'))
    .addConditionalEdges(
      'persistIntents',
      this.continueOrEnd('extractParameters'),
    )
    .addConditionalEdges(
      'extractParameters',
      this.continueOrEnd('executeAction'),
    )
    .addEdge('executeAction', 'recordExecution')
    .addEdge('recordExecution', END)
    .compile();

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly messagesService: MessagesService,
    private readonly actionsService: ActionsService,
    private readonly actionParametersService: ActionParametersService,
    private readonly detectedIntentsService: DetectedIntentsService,
    private readonly actionExecutionsService: ActionExecutionsService,
    private readonly intentLlmService: IntentLlmService,
    private readonly actionExecutorService: ActionExecutorService,
  ) {}

  run(input: {
    messageId: string;
    companyId: string;
  }): Promise<IntentGraphStateType> {
    return this.graph.invoke(input);
  }

  private continueOrEnd<T extends string>(next: T) {
    return (state: IntentGraphStateType): T | typeof END =>
      state.outcome ? END : next;
  }

  private get config() {
    return this.configService.getOrThrow('intentRecognition', { infer: true });
  }

  private async loadContext(
    state: IntentGraphStateType,
  ): Promise<IntentGraphUpdate> {
    const message = await this.messagesService.findByIdUnscoped(
      state.messageId,
    );
    if (
      !message ||
      String(message.conversation?.company?.id) !== String(state.companyId)
    ) {
      return { outcome: IntentOutcomeEnum.skipped };
    }

    const actions = await this.actionsService.findActiveByCompanyId(
      state.companyId,
    );
    if (!actions.length) {
      return { message, outcome: IntentOutcomeEnum.noActions };
    }

    const [history, parameters] = await Promise.all([
      this.messagesService.findRecentByConversationId(
        message.conversation.id,
        this.config.historyLimit,
      ),
      this.actionParametersService.findByActionIds(
        actions.map((action) => action.id),
      ),
    ]);

    return {
      message,
      history,
      catalog: actions.map((action) => ({
        action,
        parameters: parameters.filter(
          (parameter) => parameter.action?.id === action.id,
        ),
      })),
    };
  }

  private async classifyIntent(
    state: IntentGraphStateType,
  ): Promise<IntentGraphUpdate> {
    const candidates = normalizeCandidates(
      await this.intentLlmService.classify({
        history: state.history,
        message: state.message!,
        catalog: state.catalog,
        maxCandidates: this.config.maxCandidates,
      }),
      new Set(state.catalog.map(({ action }) => action.id)),
      this.config.maxCandidates,
    );

    return candidates.length
      ? { candidates }
      : { candidates, outcome: IntentOutcomeEnum.noIntent };
  }

  private async persistIntents(
    state: IntentGraphStateType,
  ): Promise<IntentGraphUpdate> {
    const message = state.message!;
    const topCatalogAction = state.catalog.find(
      ({ action }) => action.id === state.candidates[0].actionId,
    )!;
    const threshold = resolveConfidenceThreshold(
      topCatalogAction.action,
      message.conversation.company,
      this.config.defaultConfidenceThreshold,
    );
    const isBelowThreshold = state.candidates[0].confidence < threshold;

    const intents = await Promise.all(
      state.candidates.map((candidate, index) =>
        this.detectedIntentsService.createForMessage({
          status:
            index === 0 && isBelowThreshold
              ? DetectedIntentStatusEnum.belowThreshold
              : DetectedIntentStatusEnum.detected,
          rank: index + 1,
          confidenceScore: candidate.confidence,
          action: state.catalog.find(
            ({ action }) => action.id === candidate.actionId,
          )!.action,
          message,
          extractedParameters: null,
        }),
      ),
    );

    return {
      topIntent: intents[0],
      topCatalogAction,
      ...(isBelowThreshold && { outcome: IntentOutcomeEnum.belowThreshold }),
    };
  }

  private async extractParameters(
    state: IntentGraphStateType,
  ): Promise<IntentGraphUpdate> {
    const { action, parameters } = state.topCatalogAction!;
    const extractedParameters = await this.intentLlmService.extractParameters({
      history: state.history,
      action,
      parameters,
    });
    const missingParameters = parameters
      .filter(
        (parameter) =>
          parameter.isRequired &&
          (extractedParameters[parameter.name] === null ||
            extractedParameters[parameter.name] === undefined ||
            extractedParameters[parameter.name] === ''),
      )
      .map((parameter) => parameter.name);
    const needsClarification = missingParameters.length > 0;

    const topIntent = await this.detectedIntentsService.updateRecognitionResult(
      state.topIntent!.id,
      {
        status: needsClarification
          ? DetectedIntentStatusEnum.needsClarification
          : DetectedIntentStatusEnum.detected,
        extractedParameters: JSON.stringify({
          values: extractedParameters,
          missing: missingParameters,
        }),
      },
    );

    return {
      extractedParameters,
      missingParameters,
      topIntent: topIntent ?? state.topIntent,
      ...(needsClarification && {
        outcome: IntentOutcomeEnum.needsClarification,
      }),
    };
  }

  private async executeAction(
    state: IntentGraphStateType,
  ): Promise<IntentGraphUpdate> {
    return {
      executionResult: await this.actionExecutorService.execute(
        state.topCatalogAction!.action,
        state.extractedParameters,
      ),
    };
  }

  private async recordExecution(
    state: IntentGraphStateType,
  ): Promise<IntentGraphUpdate> {
    const result = state.executionResult!;

    const execution = await this.actionExecutionsService.record({
      action: state.topCatalogAction!.action,
      detectedIntent: state.topIntent!,
      requestPayload: result.requestPayload,
      status: result.success
        ? ActionExecutionStatusEnum.success
        : ActionExecutionStatusEnum.failed,
      responseStatusCode: result.responseStatusCode,
      responsePayload: result.responsePayload,
      errorMessage: result.errorMessage,
      executedAt: result.executedAt,
    });

    await this.detectedIntentsService.updateRecognitionResult(
      state.topIntent!.id,
      {
        status: result.success
          ? DetectedIntentStatusEnum.executed
          : DetectedIntentStatusEnum.executionFailed,
        extractedParameters: state.topIntent!.extractedParameters,
      },
    );

    return {
      execution,
      outcome: result.success
        ? IntentOutcomeEnum.executed
        : IntentOutcomeEnum.executionFailed,
    };
  }
}
