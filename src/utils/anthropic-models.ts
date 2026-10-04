// Claude Opus 4.7+, Sonnet 5 and Fable reject non-default sampling parameters
// (@langchain/anthropic throws before sending the request) and forced tool
// choice, which LangChain's default structured output relies on. They get
// native JSON schema output instead. Mirrors the adaptive-only prefixes in
// @langchain/anthropic.
const ADAPTIVE_ONLY_MODEL_PREFIXES = [
  'claude-opus-4-7',
  'claude-opus-4-8',
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-fable-5',
  'claude-mythos',
];

export function isAdaptiveOnlyModel(model: string): boolean {
  return ADAPTIVE_ONLY_MODEL_PREFIXES.some((prefix) =>
    model.startsWith(prefix),
  );
}

// Deterministic sampling where the model allows it.
export function samplingOptions(model: string): { temperature?: number } {
  return isAdaptiveOnlyModel(model) ? {} : { temperature: 0 };
}

export function structuredOutputMethod(
  model: string,
): 'functionCalling' | 'jsonSchema' {
  return isAdaptiveOnlyModel(model) ? 'jsonSchema' : 'functionCalling';
}

// USD per million tokens (Anthropic first-party API rates). Longest prefix
// first, so 'claude-opus-5-5' is matched before 'claude-opus-5'.
const MODEL_PRICES: [prefix: string, input: number, output: number][] = [
  ['claude-fable-5', 10, 50],
  ['claude-mythos-5', 10, 50],
  ['claude-opus-5-5', 4, 20],
  ['claude-opus-5', 5, 25],
  ['claude-opus-4-8', 5, 25],
  ['claude-opus-4-7', 5, 25],
  ['claude-opus-4-6', 5, 25],
  ['claude-sonnet-5', 2, 10],
  ['claude-sonnet-4-6', 3, 15],
  ['claude-haiku-4-5', 1, 5],
];

// Unknown models are priced at the top tier, so a budget errs on the safe side.
const FALLBACK_PRICE = { input: 10, output: 50 };

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export type LlmCallUsage = {
  // All input tokens, including cache reads and writes (as LangChain reports).
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

export function isPricedModel(model: string): boolean {
  return MODEL_PRICES.some(([prefix]) => model.startsWith(prefix));
}

export function estimateCostUsd(model: string, usage: LlmCallUsage): number {
  const match = MODEL_PRICES.find(([prefix]) => model.startsWith(prefix));
  const price = match ? { input: match[1], output: match[2] } : FALLBACK_PRICE;

  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheWrite = usage.cacheWriteTokens ?? 0;
  const uncached = Math.max(0, usage.inputTokens - cacheRead - cacheWrite);

  return (
    (uncached * price.input +
      cacheRead * price.input * CACHE_READ_MULTIPLIER +
      cacheWrite * price.input * CACHE_WRITE_MULTIPLIER +
      usage.outputTokens * price.output) /
    1_000_000
  );
}
