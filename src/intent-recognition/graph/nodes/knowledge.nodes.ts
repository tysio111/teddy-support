import { KnowledgeAnswerStatusEnum } from '../../../knowledge/knowledge.types';
import { IntentOutcomeEnum } from '../../intent-recognition.types';
import { IntentGraphDeps } from '../intent-graph.deps';
import { IntentGraphStateType, IntentGraphUpdate } from '../intent-graph.state';

// Messages that match no action: answer from the knowledge base, or hand over
// to a human when it has no answer. The reply is sent last, so a retry of
// this node never sends it twice.
export function answerFromKnowledge({
  messagesService,
  knowledgeService,
}: IntentGraphDeps) {
  return async (state: IntentGraphStateType): Promise<IntentGraphUpdate> => {
    const message = state.message!;
    const result = await knowledgeService.answer({
      message: message.content,
      history: state.history.filter(({ id }) => id !== message.id),
    });

    const knowledge = {
      status: result.status,
      rewrittenQuery: result.retrieval.rewrittenQuery,
      candidates: result.retrieval.candidates,
      chunks: result.retrieval.chunks.length,
      citations: result.citations,
    };

    if (result.status === KnowledgeAnswerStatusEnum.notFound) {
      return { knowledge, outcome: IntentOutcomeEnum.noAnswer };
    }

    await messagesService.createBotMessage(message.conversation, result.reply!);
    return { knowledge, outcome: IntentOutcomeEnum.answered };
  };
}
