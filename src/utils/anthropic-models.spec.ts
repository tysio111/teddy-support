import {
  isAdaptiveOnlyModel,
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
});
