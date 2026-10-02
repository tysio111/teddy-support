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
