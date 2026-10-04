import {
  estimateCostUsd,
  isAdaptiveOnlyModel,
  isPricedModel,
  samplingOptions,
  structuredOutputMethod,
} from './anthropic-models';

describe('anthropic-models', () => {
  it.each([
    'claude-sonnet-5',
    'claude-sonnet-5-5',
    'claude-opus-5-5',
    'claude-opus-4-7',
    'claude-fable-5-1',
  ])('%s gets no temperature and JSON schema output', (model) => {
    expect(isAdaptiveOnlyModel(model)).toBe(true);
    expect(samplingOptions(model)).toEqual({});
    expect(structuredOutputMethod(model)).toBe('jsonSchema');
  });

  it.each([
    'claude-haiku-4-5',
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-6',
    'claude-opus-4-6',
  ])('%s keeps temperature 0 and tool calling', (model) => {
    expect(isAdaptiveOnlyModel(model)).toBe(false);
    expect(samplingOptions(model)).toEqual({ temperature: 0 });
    expect(structuredOutputMethod(model)).toBe('functionCalling');
  });

  describe('estimateCostUsd', () => {
    it('should price input and output per million tokens', () => {
      expect(
        estimateCostUsd('claude-haiku-4-5-20251001', {
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        }),
      ).toBeCloseTo(6);
    });

    it('should match the longest model prefix', () => {
      const usage = { inputTokens: 1_000_000, outputTokens: 0 };
      expect(estimateCostUsd('claude-opus-5-5', usage)).toBeCloseTo(4);
      expect(estimateCostUsd('claude-opus-5', usage)).toBeCloseTo(5);
    });

    it('should discount cache reads and charge cache writes', () => {
      expect(
        estimateCostUsd('claude-sonnet-5', {
          inputTokens: 3_000_000,
          outputTokens: 0,
          cacheReadTokens: 1_000_000,
          cacheWriteTokens: 1_000_000,
        }),
      ).toBeCloseTo(2 + 0.2 + 2.5);
    });

    it('should price unknown models at the top tier', () => {
      expect(isPricedModel('some-model')).toBe(false);
      expect(
        estimateCostUsd('some-model', {
          inputTokens: 1_000_000,
          outputTokens: 0,
        }),
      ).toBeCloseTo(10);
    });
  });
});
