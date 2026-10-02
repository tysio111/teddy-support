import { Action } from '../../actions/domain/action';
import { ActionParameter } from '../../action-parameters/domain/action-parameter';
import { Company } from '../../companies/domain/company';
import { ActionExecutionResult } from '../execution/action-executor.service';
import { ConfirmationAnswerEnum } from '../intent-recognition.types';
import {
  computeBackoffMs,
  normalizeCandidates,
  parseConfirmation,
  resolveConfidenceThreshold,
  shouldRetryExecution,
  validateExtraction,
} from './intent-graph.helpers';
import { isTransientError } from './transient-error';

const parameter = (overrides: Partial<ActionParameter>) =>
  ({
    name: 'value',
    type: 'string',
    description: '',
    isRequired: true,
    enumValues: null,
    ...overrides,
  }) as ActionParameter;

describe('validateExtraction', () => {
  it('should report missing required parameters', () => {
    expect(
      validateExtraction(
        [
          parameter({ name: 'orderId' }),
          parameter({ name: 'note', isRequired: false }),
        ],
        { orderId: '', note: null },
      ),
    ).toEqual({ missing: ['orderId'], invalid: [] });
  });

  it('should report values that break format rules', () => {
    const result = validateExtraction(
      [
        parameter({ name: 'email', type: 'email' }),
        parameter({ name: 'from', type: 'date' }),
        parameter({ name: 'site', type: 'url' }),
      ],
      { email: 'john at example', from: '2026-02-30x', site: 'https://x.io' },
    );

    expect(result.missing).toEqual([]);
    expect(result.invalid.map(({ name }) => name)).toEqual(['email', 'from']);
  });

  it('should report values that do not match the schema', () => {
    const result = validateExtraction(
      [
        parameter({ name: 'amount', type: 'number' }),
        parameter({ name: 'size', enumValues: 'S,M,L' }),
      ],
      { amount: 'ten', size: 'XL' },
    );

    expect(result.invalid.map(({ name }) => name)).toEqual(['amount', 'size']);
  });
});

describe('parseConfirmation', () => {
  it.each([
    ['yes', ConfirmationAnswerEnum.yes],
    ['Yes please!', ConfirmationAnswerEnum.yes],
    ['ok go ahead', ConfirmationAnswerEnum.yes],
    ['no', ConfirmationAnswerEnum.no],
    ["Don't do that", ConfirmationAnswerEnum.no],
    ['Cancel it', ConfirmationAnswerEnum.no],
    ['What is my balance?', ConfirmationAnswerEnum.unclear],
    ['yesterday I ordered…', ConfirmationAnswerEnum.unclear],
  ])('%s → %s', (content, expected) => {
    expect(parseConfirmation(content)).toBe(expected);
  });
});

describe('execution retries', () => {
  const settings = { maxAttempts: 3, baseMs: 100, maxBackoffMs: 1000 };
  const failure = (overrides: Partial<ActionExecutionResult> = {}) =>
    ({
      success: false,
      retryable: true,
      retryAfterMs: null,
      ...overrides,
    }) as ActionExecutionResult;

  it('should retry retryable failures until the attempt limit', () => {
    expect(shouldRetryExecution(failure(), 1, settings)).toBe(true);
    expect(shouldRetryExecution(failure(), 3, settings)).toBe(false);
    expect(
      shouldRetryExecution(failure({ retryable: false }), 1, settings),
    ).toBe(false);
    expect(shouldRetryExecution(failure({ success: true }), 1, settings)).toBe(
      false,
    );
  });

  it('should not wait longer than the max backoff for Retry-After', () => {
    expect(
      shouldRetryExecution(failure({ retryAfterMs: 5000 }), 1, settings),
    ).toBe(false);
  });

  it('should back off exponentially with full jitter', () => {
    const max = () => 1;
    expect(computeBackoffMs(1, null, settings, max)).toBe(100);
    expect(computeBackoffMs(2, null, settings, max)).toBe(200);
    expect(computeBackoffMs(3, null, settings, max)).toBe(400);
    expect(computeBackoffMs(10, null, settings, max)).toBe(1000);
    expect(computeBackoffMs(3, null, settings, () => 0.5)).toBe(200);
  });

  it('should prefer the server-provided Retry-After', () => {
    expect(computeBackoffMs(1, 700, settings)).toBe(700);
  });
});

describe('isTransientError', () => {
  it.each([
    [{ status: 529 }, true],
    [{ status: 503 }, true],
    [{ status: 429 }, true],
    [{ status: 400 }, false],
    [{ status: 401 }, false],
    [{ code: 'ECONNRESET' }, true],
    [{ code: '40P01' }, true],
    [{ name: 'NodeTimeoutError' }, true],
    [
      Object.assign(new TypeError('fetch failed'), {
        cause: { code: 'ETIMEDOUT' },
      }),
      true,
    ],
    [new Error('Failed to parse structured output'), false],
    [null, false],
  ])('%o → %s', (error, expected) => {
    expect(isTransientError(error)).toBe(expected);
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
