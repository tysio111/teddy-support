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

function setup(chunks: RetrievedChunk[], outputGuardrailEnabled = false) {
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
    reviewAnswer: jest
      .fn()
      .mockResolvedValue({ verdict: 'pass', reason: 'Grounded.' }),
  };
  const service = new KnowledgeService(
    {
      enabled: true,
      historyLimit: 1,
      outputGuardrailEnabled,
    } as KnowledgeConfig,
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

  describe('output guardrail', () => {
    it('should review the reply against the cited chunks only', async () => {
      const chunks = [chunk('a', 'r1', []), chunk('b', 'r2', [])];
      const { service, llm } = setup(chunks, true);
      llm.answer.mockResolvedValue({
        status: KnowledgeAnswerStatusEnum.answered,
        reply: 'The answer.',
        usedChunks: [1],
      });

      const result = await service.answer({ message: 'question', history: [] });

      expect(llm.reviewAnswer).toHaveBeenCalledWith({
        question: 'question',
        reply: 'The answer.',
        citedChunks: [chunks[1]],
      });
      expect(result.status).toBe(KnowledgeAnswerStatusEnum.answered);
      expect(result.reply).toBe('The answer.');
      expect(result.review).toEqual({ verdict: 'pass', reason: 'Grounded.' });
    });

    it('should withhold a reply that fails the review', async () => {
      const { service, llm } = setup([chunk('a', 'r1', [])], true);
      llm.reviewAnswer.mockResolvedValue({
        verdict: 'ungrounded',
        reason: 'The price is not in the sources.',
      });

      const result = await service.answer({ message: 'question', history: [] });

      expect(result.status).toBe(KnowledgeAnswerStatusEnum.rejected);
      expect(result.reply).toBeNull();
      expect(result.review?.verdict).toBe('ungrounded');
    });

    it('should not review when there is no reply or the review is off', async () => {
      const notFound = setup([], true);
      notFound.llm.answer.mockResolvedValue({
        status: KnowledgeAnswerStatusEnum.notFound,
        reply: null,
        usedChunks: [],
      });
      const disabled = setup([chunk('a', 'r1', [])]);

      const results = await Promise.all([
        notFound.service.answer({ message: 'question', history: [] }),
        disabled.service.answer({ message: 'question', history: [] }),
      ]);

      expect(notFound.llm.reviewAnswer).not.toHaveBeenCalled();
      expect(disabled.llm.reviewAnswer).not.toHaveBeenCalled();
      expect(results.map(({ review }) => review)).toEqual([null, null]);
    });
  });
});
