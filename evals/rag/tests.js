// Builds promptfoo test cases from goldens.json.
//
// Answerable questions are scored on retrieval (contextual precision, recall,
// relevancy) and generation (faithfulness, answer relevancy). Out-of-scope
// questions and small talk must get the right status: a wrong "answered"
// there is a hallucination, a wrong "not_found" an unnecessary handover.
import { readFileSync } from 'node:fs';

const GOLDENS = JSON.parse(
  readFileSync(new URL('./goldens.json', import.meta.url), 'utf8'),
);

// Context assertions reject an empty context; a placeholder scores 0 instead,
// so a missed answer fails the metrics rather than erroring the test.
const CONTEXTS =
  'context.metadata?.contexts?.length ? context.metadata.contexts : ["(no chunks retrieved)"]';

/** Follow-ups only make sense with the conversation, so the judge sees it. */
function conversationInput(golden) {
  const history = golden.history ?? [];
  if (!history.length) return golden.input;
  const turns = history.map((t) => `${t.sender}: ${t.content}`).join('\n');
  return `${turns}\nclient: ${golden.input}`;
}

function answerableAssertions(golden) {
  return [
    { type: 'javascript', value: 'file://assertions/status.js', metric: 'status' },
    // Retrieval: are the relevant chunks ranked first / all there / mostly
    // relevant? Relevancy is lenient: chunks carry neighbouring facts by
    // design.
    {
      type: 'javascript',
      value: 'file://assertions/contextual-precision.js',
      config: { threshold: 0.7 },
      metric: 'contextual-precision',
    },
    {
      type: 'context-recall',
      value: golden.expected_output,
      threshold: 0.7,
      contextTransform: CONTEXTS,
      metric: 'contextual-recall',
    },
    {
      type: 'context-relevance',
      threshold: 0.4,
      contextTransform: CONTEXTS,
      metric: 'contextual-relevancy',
    },
    // Generation: grounded in the chunks, and on topic.
    {
      type: 'context-faithfulness',
      threshold: 0.8,
      contextTransform: CONTEXTS,
      metric: 'faithfulness',
    },
    { type: 'answer-relevance', threshold: 0.7, metric: 'answer-relevancy' },
  ];
}

export default function generateTests() {
  return GOLDENS.map((golden) => ({
    description: golden.name,
    vars: {
      question: golden.input,
      history: golden.history ?? [],
      // The RAG assertions read the question from `query`.
      query: conversationInput(golden),
      expected_status: golden.expected_status,
      ...(golden.expected_output && { expected_output: golden.expected_output }),
      ...(golden.source && { source: golden.source }),
    },
    assert:
      golden.expected_status === 'answered'
        ? answerableAssertions(golden)
        : [
            {
              type: 'javascript',
              value: 'file://assertions/status.js',
              metric: 'status',
            },
          ],
  }));
}
