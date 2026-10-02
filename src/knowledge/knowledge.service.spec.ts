import { KnowledgeConfig } from './config/knowledge-config.type';
import { KnowledgeLlmService } from './llm/knowledge-llm.service';
import {
  KnowledgeAnswerStatusEnum,
  RetrievalResult,
  RetrievedChunk,
} from './knowledge.types';
import { KnowledgeRetriever } from './retrieval/knowledge-retriever';
import { KnowledgeService } from './knowledge.service';

function chunk(
  id: string,
  resourceId: string,
  headingPath: string[],
): RetrievedChunk {
  return {
    id,
    score: 0.5,
    relevance: 3,
    resourceId,
    resourceTitle: `Title ${resourceId}`,
    headingPath,
    chunkIndex: 0,
    text: `text ${id}`,
    context: null,
  };
}

function setup(chunks: RetrievedChunk[]) {
  const retrieval: RetrievalResult = {
    rewrittenQuery: 'query',
    hypotheticalAnswer: null,
    candidates: chunks.length,
    chunks,
  };
  const retriever = { retrieve: jest.fn().mockResolvedValue(retrieval) };
  const llm = {
    answer: jest.fn().mockResolvedValue({
      status: KnowledgeAnswerStatusEnum.answered,
      reply: 'The answer.',
      usedChunks: chunks.map((_, index) => index),
    }),
  };
  const service = new KnowledgeService(
    { enabled: true, historyLimit: 1 } as KnowledgeConfig,
    retriever as unknown as KnowledgeRetriever,
    llm as unknown as KnowledgeLlmService,
  );

  return { service, retriever, llm };
}

describe('KnowledgeService', () => {
  it('should cite each used section once', async () => {
    const { service } = setup([
      chunk('a', 'r1', ['Returns']),
      chunk('b', 'r1', ['Returns']),
      chunk('c', 'r2', []),
    ]);

    const result = await service.answer({ message: 'question', history: [] });

    expect(result.status).toBe(KnowledgeAnswerStatusEnum.answered);
    expect(result.reply).toBe('The answer.');
    expect(result.citations).toEqual([
      { resourceId: 'r1', resourceTitle: 'Title r1', headingPath: ['Returns'] },
      { resourceId: 'r2', resourceTitle: 'Title r2', headingPath: [] },
    ]);
  });

  it('should still ask the model when nothing was retrieved', async () => {
    const { service, llm } = setup([]);
    llm.answer.mockResolvedValue({
      status: KnowledgeAnswerStatusEnum.smallTalk,
      reply: 'Hi! How can I help?',
      usedChunks: [],
    });

    const result = await service.answer({ message: 'Hello', history: [] });

    expect(llm.answer).toHaveBeenCalledWith(
      expect.objectContaining({ chunks: [] }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: KnowledgeAnswerStatusEnum.smallTalk,
        citations: [],
      }),
    );
  });

  it('should pass options to retrieval and limit history for the answer', async () => {
    const { service, retriever, llm } = setup([]);
    const history = [
      { sender: 'client', content: 'one' },
      { sender: 'bot', content: 'two' },
    ];

    await service.answer({
      message: 'question',
      history,
      options: { rerank: false },
    });

    expect(retriever.retrieve).toHaveBeenCalledWith({
      message: 'question',
      history,
      options: { rerank: false },
    });
    expect(llm.answer).toHaveBeenCalledWith(
      expect.objectContaining({ history: [history[1]] }),
    );
  });
});
