// The pipeline must answer answerable questions, and hand over (not_found) or
// stay quiet (small_talk) otherwise. An answer rejected by the output guardrail
// is handed over too, so it counts as not_found.
export default function status(output, context) {
  const expected = context.vars.expected_status;
  const actual = context.metadata?.status;
  const pass =
    actual === expected ||
    (expected === 'not_found' && actual === 'rejected');
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? `status ${actual}`
      : `expected ${expected}, got ${actual} ` +
        `(query: ${JSON.stringify(context.metadata?.rewrittenQuery)}, ` +
        `${context.metadata?.contexts?.length ?? 0} chunks): ${JSON.stringify(output)}`,
  };
}
