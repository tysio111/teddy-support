import {
  Command,
  END,
  NodeError,
  RetryPolicy,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { IntentGraphDeps } from './intent-graph.deps';
import { ExtractTask, toExtraction } from './intent-graph.helpers';
import {
  continueOrEnd,
  reExtractSelected,
  routeAfterAttempt,
  routeAfterClassification,
  routeAfterCircuit,
  routeAfterConfirmation,
  routeAfterFinalize,
  routeAfterKnowledge,
  routeAfterPersist,
  routeAfterSelection,
  routeAfterValidation,
} from './intent-graph.routing';
import { IntentGraphState, IntentGraphUpdate } from './intent-graph.state';
import { isTransientError } from './transient-error';
import { classifyIntent, persistIntents } from './nodes/classification.nodes';
import { dedupe, guardrail, loadContext } from './nodes/context.nodes';
import {
  backoff,
  checkCircuit,
  executeAction,
  finalizeExecution,
  generateResponse,
  recordAttempt,
  sendFallbackReply,
} from './nodes/execution.nodes';
import { escalateToHuman, handleError } from './nodes/failure.nodes';
import { answerFromKnowledge } from './nodes/knowledge.nodes';
import {
  askClarification,
  askConfirmation,
  awaitClarification,
  awaitConfirmation,
} from './nodes/human-in-the-loop.nodes';
import {
  extractParameters,
  repairParameters,
  selectCandidate,
  validateParameters,
} from './nodes/parameters.nodes';

// LLM calls: rate limits and overload are common and usually clear quickly.
const LLM_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialInterval: 1000,
  backoffFactor: 2,
  maxInterval: 8000,
  retryOn: isTransientError,
};

// Database reads/writes: connection blips, deadlocks, serialization failures.
const IO_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialInterval: 200,
  backoffFactor: 2,
  maxInterval: 2000,
  retryOn: isTransientError,
};

// Records per-node latency; the reducer merges entries from parallel nodes.
function timed<S>(
  node: string,
  fn: (state: S) => Promise<IntentGraphUpdate>,
): (state: S) => Promise<IntentGraphUpdate> {
  return async (state) => {
    const startedAt = performance.now();
    const update = await fn(state);
    return {
      ...update,
      metrics: [{ node, ms: Math.round(performance.now() - startedAt) }],
    };
  };
}

const toHandleError = (_state: unknown, { node, error }: NodeError) =>
  new Command({
    update: { error: { node, message: error.message } },
    goto: 'handleError',
  });

/**
 * START → loadContext → dedupe → guardrail → classifyIntent → persistIntents
 *   → extractParameters × N (parallel, one per candidate above threshold)
 *   → validateParameters ⇄ repairParameters (bounded self-correction)
 *   → selectCandidate (falls back to the next candidate if extraction failed)
 *   → askClarification → awaitClarification ⏸ → extractParameters …
 *   → askConfirmation → awaitConfirmation ⏸ (actions requiring confirmation)
 *   → checkCircuit → executeAction → recordAttempt ⇄ backoff (safe retries)
 *   → finalizeExecution → generateResponse → END
 *
 * Messages that match no action (or arrive when there are none) go from
 * classifyIntent to answerFromKnowledge when the knowledge base is enabled:
 * it replies, or escalates when the knowledge base has no answer.
 *
 * Failures: nodes retry transient errors (retryPolicy); once exhausted they
 * route to handleError → escalateToHuman. Low confidence, repeated missing
 * info, an open circuit or a failed execution also escalate to a human.
 * ⏸ = interrupt: the run is checkpointed and resumed by the client's next
 * message in the same conversation.
 */
export function buildIntentGraph(deps: IntentGraphDeps) {
  const { config, knowledgeService } = deps;
  const llmNode = {
    retryPolicy: LLM_RETRY_POLICY,
    timeout: config.llmNodeTimeoutMs,
    errorHandler: toHandleError,
  };
  const ioNode = {
    retryPolicy: IO_RETRY_POLICY,
    errorHandler: toHandleError,
  };

  return (
    new StateGraph(IntentGraphState)
      // Context and screening
      .addNode('loadContext', timed('loadContext', loadContext(deps)), ioNode)
      .addNode('dedupe', timed('dedupe', dedupe(deps)), ioNode)
      .addNode('guardrail', timed('guardrail', guardrail(deps)), llmNode)
      // Classification
      .addNode(
        'classifyIntent',
        timed('classifyIntent', classifyIntent(deps)),
        llmNode,
      )
      .addNode(
        'persistIntents',
        timed('persistIntents', persistIntents(deps)),
        ioNode,
      )
      // Parameters
      .addNode(
        'extractParameters',
        timed('extractParameters', (task) =>
          extractParameters(deps)(task as unknown as ExtractTask),
        ),
        {
          ...llmNode,
          // A failed candidate must not fail the whole run: record it and
          // let selection fall back to the next one.
          errorHandler: (task: unknown, { error }: NodeError) =>
            new Command({
              update: {
                candidateExtractions: [
                  toExtraction(task as ExtractTask, {}, error.message),
                ],
              },
              goto: 'validateParameters',
            }),
        },
      )
      .addNode(
        'validateParameters',
        timed('validateParameters', validateParameters),
        { errorHandler: toHandleError },
      )
      .addNode(
        'repairParameters',
        timed('repairParameters', repairParameters(deps)),
        llmNode,
      )
      .addNode(
        'selectCandidate',
        timed('selectCandidate', selectCandidate(deps)),
        ioNode,
      )
      // Human in the loop
      .addNode(
        'askClarification',
        timed('askClarification', askClarification(deps)),
        ioNode,
      )
      .addNode('awaitClarification', awaitClarification(deps), ioNode)
      .addNode(
        'askConfirmation',
        timed('askConfirmation', askConfirmation(deps)),
        ioNode,
      )
      .addNode('awaitConfirmation', awaitConfirmation(deps), ioNode)
      // Execution
      .addNode(
        'checkCircuit',
        timed('checkCircuit', checkCircuit(deps)),
        ioNode,
      )
      .addNode(
        'executeAction',
        timed('executeAction', executeAction(deps)),
        // No retryPolicy: re-sending a request is decided explicitly by
        // routeAfterAttempt, which knows whether that is safe.
        { errorHandler: toHandleError },
      )
      .addNode(
        'recordAttempt',
        timed('recordAttempt', recordAttempt(deps)),
        ioNode,
      )
      .addNode('backoff', backoff(deps))
      .addNode(
        'finalizeExecution',
        timed('finalizeExecution', finalizeExecution(deps)),
        ioNode,
      )
      .addNode(
        'generateResponse',
        timed('generateResponse', generateResponse(deps)),
        {
          ...llmNode,
          // Degrade gracefully: a canned reply beats no reply.
          errorHandler: sendFallbackReply(deps),
        },
      )
      // Knowledge base
      .addNode(
        'answerFromKnowledge',
        timed('answerFromKnowledge', answerFromKnowledge(deps)),
        {
          ...llmNode,
          // Several model calls in sequence: query rewrite, rerank, answer.
          timeout: config.llmNodeTimeoutMs * 3,
        },
      )
      // Failure handling
      .addNode('handleError', handleError(deps), {
        retryPolicy: IO_RETRY_POLICY,
      })
      .addNode('escalateToHuman', escalateToHuman(deps), {
        retryPolicy: IO_RETRY_POLICY,
      })

      .addEdge(START, 'loadContext')
      .addConditionalEdges('loadContext', continueOrEnd('dedupe'))
      .addConditionalEdges('dedupe', continueOrEnd('guardrail'))
      .addConditionalEdges('guardrail', continueOrEnd('classifyIntent'))
      .addConditionalEdges(
        'classifyIntent',
        (state) => routeAfterClassification(state, knowledgeService.enabled),
        ['answerFromKnowledge', 'persistIntents', END],
      )
      .addConditionalEdges('answerFromKnowledge', routeAfterKnowledge, [
        'escalateToHuman',
        END,
      ])
      .addConditionalEdges('persistIntents', routeAfterPersist, [
        'escalateToHuman',
        'extractParameters',
      ])
      .addEdge('extractParameters', 'validateParameters')
      .addConditionalEdges(
        'validateParameters',
        (state) => routeAfterValidation(state, config),
        ['repairParameters', 'selectCandidate'],
      )
      .addEdge('repairParameters', 'validateParameters')
      .addConditionalEdges(
        'selectCandidate',
        (state) => routeAfterSelection(state, config),
        [
          'handleError',
          'askClarification',
          'escalateToHuman',
          'askConfirmation',
          'checkCircuit',
        ],
      )
      .addEdge('askClarification', 'awaitClarification')
      .addConditionalEdges('awaitClarification', reExtractSelected, [
        'extractParameters',
      ])
      .addEdge('askConfirmation', 'awaitConfirmation')
      .addConditionalEdges('awaitConfirmation', routeAfterConfirmation, [
        'checkCircuit',
        'generateResponse',
        END,
      ])
      .addConditionalEdges('checkCircuit', routeAfterCircuit, [
        'escalateToHuman',
        'executeAction',
      ])
      .addEdge('executeAction', 'recordAttempt')
      .addConditionalEdges(
        'recordAttempt',
        (state) => routeAfterAttempt(state, config),
        ['backoff', 'finalizeExecution'],
      )
      .addEdge('backoff', 'executeAction')
      .addConditionalEdges('finalizeExecution', routeAfterFinalize, [
        'generateResponse',
        'escalateToHuman',
      ])
      .addEdge('generateResponse', END)
      .addEdge('handleError', 'escalateToHuman')
      .addEdge('escalateToHuman', END)
      .compile({ checkpointer: deps.checkpointer })
  );
}

export type IntentGraph = ReturnType<typeof buildIntentGraph>;
