import { ConfigService } from '@nestjs/config';
import { Action } from '../../actions/domain/action';
import { ActionParameter } from '../../action-parameters/domain/action-parameter';
import { Company } from '../../companies/domain/company';
import { Message } from '../../messages/domain/message';
import { IntentOutcomeEnum } from '../intent-recognition.types';
import {
  IntentGraphService,
  normalizeCandidates,
  resolveConfidenceThreshold,
} from './intent-graph.service';

const company = { id: 'company-1', confidenceThreshold: null } as Company;

const message = {
  id: 'message-1',
  content: 'Where is my order 123?',
  sender: 'client',
  conversation: { id: 'conversation-1', company },
} as Message;

const orderAction = {
  id: 'action-order',
  name: 'check_order_status',
  description: 'Check order status',
  confidenceThreshold: null,
  httpMethod: 'GET',
  endpointUrl: 'https://example.com/orders',
  authType: 'none',
} as Action;

const refundAction = {
  id: 'action-refund',
  name: 'request_refund',
  description: 'Request a refund',
  confidenceThreshold: null,
} as Action;

const orderIdParameter = {
  id: 'param-1',
  name: 'orderId',
  type: 'string',
  description: 'Order number',
  isRequired: true,
  order: 1,
  action: orderAction,
} as ActionParameter;

function createService() {
  const config = {
    historyLimit: 20,
    maxCandidates: 3,
    defaultConfidenceThreshold: 0.7,
  };
  const deps = {
    configService: {
      getOrThrow: jest.fn().mockReturnValue(config),
    },
    messagesService: {
      findByIdUnscoped: jest.fn().mockResolvedValue(message),
      findRecentByConversationId: jest.fn().mockResolvedValue([message]),
    },
    actionsService: {
      findActiveByCompanyId: jest
        .fn()
        .mockResolvedValue([orderAction, refundAction]),
    },
    actionParametersService: {
      findByActionIds: jest.fn().mockResolvedValue([orderIdParameter]),
    },
    detectedIntentsService: {
      createForMessage: jest
        .fn()
        .mockImplementation((data) =>
          Promise.resolve({ ...data, id: `intent-${data.rank}` }),
        ),
      updateRecognitionResult: jest
        .fn()
        .mockImplementation((id, payload) =>
          Promise.resolve({ id, ...payload }),
        ),
    },
    actionExecutionsService: {
      record: jest
        .fn()
        .mockImplementation((data) =>
          Promise.resolve({ ...data, id: 'execution-1' }),
        ),
    },
    intentLlmService: {
      classify: jest.fn(),
      extractParameters: jest.fn(),
    },
    actionExecutorService: {
      execute: jest.fn().mockResolvedValue({
        success: true,
        requestPayload: '{}',
        responseStatusCode: 200,
        responsePayload: '{"status":"shipped"}',
        errorMessage: null,
        executedAt: new Date(),
      }),
    },
  };

  const service = new IntentGraphService(
    deps.configService as unknown as ConfigService,
    deps.messagesService as any,
    deps.actionsService as any,
    deps.actionParametersService as any,
    deps.detectedIntentsService as any,
    deps.actionExecutionsService as any,
    deps.intentLlmService as any,
    deps.actionExecutorService as any,
  );

  return { service, deps };
}

const input = { messageId: message.id, companyId: company.id };

describe('IntentGraphService', () => {
  it('should skip messages that do not belong to the company', async () => {
    const { service, deps } = createService();

    const state = await service.run({ ...input, companyId: 'other' });

    expect(state.outcome).toBe(IntentOutcomeEnum.skipped);
    expect(deps.intentLlmService.classify).not.toHaveBeenCalled();
  });

  it('should end when the company has no active actions', async () => {
    const { service, deps } = createService();
    deps.actionsService.findActiveByCompanyId.mockResolvedValue([]);

    const state = await service.run(input);

    expect(state.outcome).toBe(IntentOutcomeEnum.noActions);
    expect(deps.intentLlmService.classify).not.toHaveBeenCalled();
  });

  it('should end with no_intent when only hallucinated actions are returned', async () => {
    const { service, deps } = createService();
    deps.intentLlmService.classify.mockResolvedValue([
      { actionId: 'made-up', confidence: 0.99, reasoning: '' },
    ]);

    const state = await service.run(input);

    expect(state.outcome).toBe(IntentOutcomeEnum.noIntent);
    expect(deps.detectedIntentsService.createForMessage).not.toHaveBeenCalled();
  });

  it('should persist ranked intents and stop below threshold', async () => {
    const { service, deps } = createService();
    deps.intentLlmService.classify.mockResolvedValue([
      { actionId: refundAction.id, confidence: 0.3, reasoning: '' },
      { actionId: orderAction.id, confidence: 0.5, reasoning: '' },
    ]);

    const state = await service.run(input);

    expect(state.outcome).toBe(IntentOutcomeEnum.belowThreshold);
    expect(deps.detectedIntentsService.createForMessage).toHaveBeenCalledTimes(
      2,
    );
    expect(deps.detectedIntentsService.createForMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: orderAction,
        rank: 1,
        confidenceScore: 0.5,
        status: 'below_threshold',
      }),
    );
    expect(deps.detectedIntentsService.createForMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: refundAction,
        rank: 2,
        status: 'detected',
      }),
    );
    expect(deps.intentLlmService.extractParameters).not.toHaveBeenCalled();
  });

  it('should ask for clarification when a required parameter is missing', async () => {
    const { service, deps } = createService();
    deps.intentLlmService.classify.mockResolvedValue([
      { actionId: orderAction.id, confidence: 0.9, reasoning: '' },
    ]);
    deps.intentLlmService.extractParameters.mockResolvedValue({
      orderId: null,
    });

    const state = await service.run(input);

    expect(state.outcome).toBe(IntentOutcomeEnum.needsClarification);
    expect(state.missingParameters).toEqual(['orderId']);
    expect(
      deps.detectedIntentsService.updateRecognitionResult,
    ).toHaveBeenCalledWith('intent-1', {
      status: 'needs_clarification',
      extractedParameters: JSON.stringify({
        values: { orderId: null },
        missing: ['orderId'],
      }),
    });
    expect(deps.actionExecutorService.execute).not.toHaveBeenCalled();
  });

  it('should execute the action and record the execution', async () => {
    const { service, deps } = createService();
    deps.intentLlmService.classify.mockResolvedValue([
      { actionId: orderAction.id, confidence: 0.9, reasoning: '' },
    ]);
    deps.intentLlmService.extractParameters.mockResolvedValue({
      orderId: '123',
    });

    const state = await service.run(input);

    expect(state.outcome).toBe(IntentOutcomeEnum.executed);
    expect(deps.intentLlmService.extractParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        action: orderAction,
        parameters: [orderIdParameter],
      }),
    );
    expect(deps.actionExecutorService.execute).toHaveBeenCalledWith(
      orderAction,
      { orderId: '123' },
    );
    expect(deps.actionExecutionsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: orderAction,
        status: 'success',
        responseStatusCode: 200,
      }),
    );
    expect(
      deps.detectedIntentsService.updateRecognitionResult,
    ).toHaveBeenLastCalledWith(
      'intent-1',
      expect.objectContaining({ status: 'executed' }),
    );
  });

  it('should mark the intent as failed when execution fails', async () => {
    const { service, deps } = createService();
    deps.intentLlmService.classify.mockResolvedValue([
      { actionId: orderAction.id, confidence: 0.9, reasoning: '' },
    ]);
    deps.intentLlmService.extractParameters.mockResolvedValue({
      orderId: '123',
    });
    deps.actionExecutorService.execute.mockResolvedValue({
      success: false,
      requestPayload: '{}',
      responseStatusCode: 500,
      responsePayload: 'boom',
      errorMessage: 'Endpoint responded with status 500',
      executedAt: new Date(),
    });

    const state = await service.run(input);

    expect(state.outcome).toBe(IntentOutcomeEnum.executionFailed);
    expect(deps.actionExecutionsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});

describe('resolveConfidenceThreshold', () => {
  it('should prefer action, then company, then default', () => {
    expect(
      resolveConfidenceThreshold(
        { confidenceThreshold: 0.9 } as Action,
        { confidenceThreshold: 0.8 } as Company,
        0.7,
      ),
    ).toBe(0.9);
    expect(
      resolveConfidenceThreshold(
        { confidenceThreshold: null } as Action,
        { confidenceThreshold: 0.8 } as Company,
        0.7,
      ),
    ).toBe(0.8);
    expect(
      resolveConfidenceThreshold(
        { confidenceThreshold: null } as Action,
        { confidenceThreshold: null } as Company,
        0.7,
      ),
    ).toBe(0.7);
  });
});

describe('normalizeCandidates', () => {
  it('should drop unknown and duplicate actions, sort and limit', () => {
    expect(
      normalizeCandidates(
        [
          { actionId: 'a', confidence: 0.2, reasoning: '' },
          { actionId: 'x', confidence: 0.99, reasoning: '' },
          { actionId: 'b', confidence: 0.8, reasoning: '' },
          { actionId: 'b', confidence: 0.1, reasoning: '' },
          { actionId: 'c', confidence: 0.5, reasoning: '' },
        ],
        new Set(['a', 'b', 'c']),
        2,
      ).map((candidate) => candidate.actionId),
    ).toEqual(['b', 'c']);
  });
});
