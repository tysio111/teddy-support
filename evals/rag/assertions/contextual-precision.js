// Contextual precision: are the chunks that matter ranked above the ones that
// don't? promptfoo has no rank-aware context metric, and this is the one that
// moves when reranking changes. The judge marks each chunk relevant or not
// against the expected answer; the score is the average precision@k over the
// relevant positions (1 = every relevant chunk comes before every irrelevant
// one, 0 = no relevant chunk at all).
import { assertions } from 'promptfoo';

function rubric(context) {
  return [
    'The text is a chunk retrieved to answer the question below. It passes if it',
    'states at least one fact that the expected answer relies on, and fails',
    'otherwise.',
    '',
    `Question: ${context.vars.query}`,
    `Expected answer: ${context.vars.expected_output}`,
  ].join('\n');
}

export default async function contextualPrecision(output, context) {
  const threshold = context.config?.threshold ?? 0.5;
  const chunks = context.metadata?.contexts ?? [];
  if (!chunks.length) {
    return { pass: false, score: 0, reason: 'no chunks retrieved' };
  }

  const verdicts = await Promise.all(
    chunks.map((chunk) =>
      assertions.matchesLlmRubric(rubric(context), chunk, context.test?.options),
    ),
  );

  let relevantSoFar = 0;
  let sum = 0;
  verdicts.forEach((verdict, index) => {
    if (verdict.pass) {
      relevantSoFar += 1;
      sum += relevantSoFar / (index + 1);
    }
  });
  const score = relevantSoFar ? sum / relevantSoFar : 0;
  const ranks = verdicts.map((v) => (v.pass ? '+' : '-')).join('');
  return {
    pass: score >= threshold,
    score,
    reason: `Precision ${score.toFixed(2)} (threshold ${threshold}), relevance by rank: ${ranks}`,
  };
}
