// Offline evaluation of the intent LLM prompts against a fixed set of
// conversations. Calls the real model: run with `npm run eval:intents`
// (needs ANTHROPIC_API_KEY). Use it to catch regressions when changing
// prompts or models.
import { ChatAnthropic } from '@langchain/anthropic';
import { IntentLlmService } from '../llm/intent-llm.service';
import { normalizeCandidates } from '../graph/intent-graph.helpers';
import { EVAL_CASES, EVAL_CATALOG, EvalCase, toMessages } from './fixtures';

const CONFIDENCE_THRESHOLD = 0.7;

type CaseResult = {
  name: string;
  classificationOk: boolean;
  parametersOk: boolean | null;
  detail: string;
};

async function runCase(
  llm: IntentLlmService,
  testCase: EvalCase,
): Promise<CaseResult> {
  const history = toMessages(testCase.transcript);
  const candidates = normalizeCandidates(
    await llm.classify({
      history,
      message: history[history.length - 1],
      catalog: EVAL_CATALOG,
      maxCandidates: 3,
    }),
    new Set(EVAL_CATALOG.map(({ action }) => action.id)),
    3,
  );
  const top = candidates[0];
  const predicted =
    top && top.confidence >= CONFIDENCE_THRESHOLD ? top.actionId : null;
  const classificationOk = predicted === testCase.expectedActionId;

  let parametersOk: boolean | null = null;
  let detail = `predicted=${predicted ?? 'none'} (${top?.confidence ?? '-'})`;

  if (classificationOk && predicted && testCase.expectedParameters) {
    const catalogAction = EVAL_CATALOG.find(
      ({ action }) => action.id === predicted,
    )!;
    const values = await llm.extractParameters({
      history,
      action: catalogAction.action,
      parameters: catalogAction.parameters,
    });
    parametersOk = Object.entries(testCase.expectedParameters).every(
      ([name, expected]) => (values[name] ?? null) === expected,
    );
    detail += ` params=${JSON.stringify(values)}`;
  }

  return { name: testCase.name, classificationOk, parametersOk, detail };
}

async function main(): Promise<void> {
  const model = process.env.INTENT_LLM_MODEL || 'claude-haiku-4-5-20251001';
  const llm = new IntentLlmService({
    primary: new ChatAnthropic({
      model,
      apiKey: process.env.ANTHROPIC_API_KEY,
      temperature: 0,
    }),
    fallback: null,
  });

  console.log(`Evaluating ${EVAL_CASES.length} cases with ${model}\n`);

  const results: CaseResult[] = [];
  for (const testCase of EVAL_CASES) {
    const result = await runCase(llm, testCase);
    results.push(result);
    const ok = result.classificationOk && result.parametersOk !== false;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${result.name}  ${result.detail}`);
  }

  const classified = results.filter((result) => result.classificationOk);
  const withParameters = results.filter(
    (result) => result.parametersOk !== null,
  );
  const parametersOk = withParameters.filter((result) => result.parametersOk);

  console.log(
    `\nClassification accuracy: ${classified.length}/${results.length}` +
      `\nParameter exact match:   ${parametersOk.length}/${withParameters.length}`,
  );

  if (
    classified.length < results.length ||
    parametersOk.length < withParameters.length
  ) {
    process.exitCode = 1;
  }
}

void main();
