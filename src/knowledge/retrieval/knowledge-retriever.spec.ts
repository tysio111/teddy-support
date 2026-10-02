import { KnowledgeConfig } from '../config/knowledge-config.type';
import { KnowledgeLlmService } from '../llm/knowledge-llm.service';
import { RetrievedChunk } from '../knowledge.types';
import { DenseEmbedder } from './dense-embedder';
import { KnowledgeRetriever, selectRelevant } from './knowledge-retriever';
import { SparseEncoder } from './sparse-encoder';
import { KnowledgeVectorStore } from './vector-store';

function chunk(id: string): RetrievedChunk {
  return {
    id,
    score: 0.5,
    relevance: null,
    resourceId: 'resource-1',
    resourceTitle: 'Shipping',
    headingPath: [],
    chunkIndex: 0,
    text: `text of ${id}`,
    context: null,
  };
}

const candidates = ['a', 'b', 'c', 'd'].map(chunk);

function setup(configOverrides: Partial<KnowledgeConfig> = {}) {
  const config = {
    historyLimit: 6,
    prefetchLimit: 40,
    rerankCandidates: 20,
    topK: 2,
    minRelevance: 2,
    hydeEnabled: false,
    rerankEnabled: true,
    ...configOverrides,
  } as KnowledgeConfig;
  const llm = {
    rewriteQuery: jest.fn().mockResolvedValue('rewritten query'),
    hypotheticalAnswer: jest.fn().mockResolvedValue('hypothetical passage'),
    rerank: jest.fn().mockResolvedValue([1, 3, 2, 0]),
  };
  const embedder = { embedQuery: jest.fn().mockResolvedValue([0.1, 0.2]) };
  const sparseEncoder = new SparseEncoder();
  const store = { search: jest.fn().mockResolvedValue(candidates) };

  const retriever = new KnowledgeRetriever(
    config,
    llm as unknown as KnowledgeLlmService,
    embedder as unknown as DenseEmbedder,
    sparseEncoder,
    store as unknown as KnowledgeVectorStore,
  );

  return { retriever, llm, embedder, sparseEncoder, store };
}

const history = [
  { sender: 'client', content: 'Do you ship to Germany?' },
  { sender: 'bot', content: 'Yes, we do.' },
];

describe('KnowledgeRetriever', () => {
  it('should use a first message as the query without rewriting', async () => {
    const { retriever, llm, embedder } = setup();

    const result = await retriever.retrieve({
      message: 'Do you ship to Germany?',
      history: [],
    });

    expect(llm.rewriteQuery).not.toHaveBeenCalled();
    expect(result.rewrittenQuery).toBe('Do you ship to Germany?');
    expect(embedder.embedQuery).toHaveBeenCalledWith('Do you ship to Germany?');
  });

  it('should rewrite follow-ups using recent history', async () => {
    const { retriever, llm } = setup({ historyLimit: 1 });

    const result = await retriever.retrieve({
      message: 'How long does it take?',
      history,
    });

    expect(llm.rewriteQuery).toHaveBeenCalledWith({
      history: [history[1]],
      message: 'How long does it take?',
      language: undefined,
    });
    expect(result.rewrittenQuery).toBe('rewritten query');
  });

  it('should rewrite a first message into the knowledge base language', async () => {
    const { retriever, llm } = setup({ language: 'english' });

    await retriever.retrieve({ message: 'Wysyłacie do Niemiec?', history: [] });

    expect(llm.rewriteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'english' }),
    );
  });

  it('should search hybrid and keep the most relevant reranked chunks', async () => {
    const { retriever, llm, store, sparseEncoder } = setup();

    const result = await retriever.retrieve({ message: 'query', history: [] });

    expect(store.search).toHaveBeenCalledWith({
      dense: [0.1, 0.2],
      sparse: sparseEncoder.encode('query'),
      prefetchLimit: 40,
      limit: 20,
      hybrid: true,
    });
    expect(llm.rerank).toHaveBeenCalledWith('query', candidates);
    expect(result.candidates).toBe(4);
    expect(result.chunks.map(({ id, relevance }) => [id, relevance])).toEqual([
      ['b', 3],
      ['c', 2],
    ]);
  });

  it('should take the top fused results when reranking is off', async () => {
    const { retriever, llm, store } = setup({ rerankEnabled: false });

    const result = await retriever.retrieve({ message: 'query', history: [] });

    expect(llm.rerank).not.toHaveBeenCalled();
    expect(store.search).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 2 }),
    );
    expect(result.chunks.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('should embed the hypothetical answer but keyword-search the query', async () => {
    const { retriever, embedder, store, sparseEncoder } = setup();

    const result = await retriever.retrieve({
      message: 'query',
      history: [],
      options: { hyde: true },
    });

    expect(result.hypotheticalAnswer).toBe('hypothetical passage');
    expect(embedder.embedQuery).toHaveBeenCalledWith(
      'query\n\nhypothetical passage',
    );
    expect(store.search).toHaveBeenCalledWith(
      expect.objectContaining({ sparse: sparseEncoder.encode('query') }),
    );
  });

  it('should let request options override the configuration', async () => {
    const { retriever, llm, store } = setup({
      hydeEnabled: true,
      rerankEnabled: true,
    });

    await retriever.retrieve({
      message: 'query',
      history: [],
      options: { hybrid: false, hyde: false, rerank: false },
    });

    expect(llm.hypotheticalAnswer).not.toHaveBeenCalled();
    expect(llm.rerank).not.toHaveBeenCalled();
    expect(store.search).toHaveBeenCalledWith(
      expect.objectContaining({ hybrid: false }),
    );
  });

  it('should not rerank when the search found nothing', async () => {
    const { retriever, llm, store } = setup();
    store.search.mockResolvedValue([]);

    const result = await retriever.retrieve({ message: 'query', history: [] });

    expect(llm.rerank).not.toHaveBeenCalled();
    expect(result.chunks).toEqual([]);
  });
});

describe('selectRelevant', () => {
  it('should keep fused order for equal relevance', () => {
    const selected = selectRelevant(candidates, [2, 3, 2, 2], {
      minRelevance: 2,
      topK: 3,
    });

    expect(selected.map(({ id }) => id)).toEqual(['b', 'a', 'c']);
  });

  it('should treat missing ratings as unrelated', () => {
    expect(
      selectRelevant(candidates, [3], { minRelevance: 1, topK: 10 }).map(
        ({ id }) => id,
      ),
    ).toEqual(['a']);
  });
});
