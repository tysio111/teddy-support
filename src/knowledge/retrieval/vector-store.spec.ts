import { QdrantClient } from '@qdrant/js-client-rest';
import { IndexedChunk, KnowledgeVectorStore } from './vector-store';

function setup(exists = true) {
  const client = {
    collectionExists: jest.fn().mockResolvedValue({ exists }),
    createCollection: jest.fn().mockResolvedValue(true),
    createPayloadIndex: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockResolvedValue({
      points: [
        {
          id: 'point-1',
          version: 1,
          score: 0.03,
          payload: {
            resourceId: 'resource-1',
            resourceTitle: 'Shipping',
            headingPath: ['Delivery'],
            chunkIndex: 2,
            text: 'Three to five days.',
            context: 'Delivery times within the EU.',
            version: 'v1',
          },
        },
      ],
    }),
  };
  const store = new KnowledgeVectorStore(
    client as unknown as QdrantClient,
    'knowledge',
    4,
  );
  return { store, client };
}

const query = {
  dense: [0.1, 0.2, 0.3, 0.4],
  sparse: { indices: [7, 9], values: [1, 2] },
  prefetchLimit: 40,
  limit: 20,
  hybrid: true,
};

describe('KnowledgeVectorStore', () => {
  it('should create the collection with dense and IDF sparse vectors once', async () => {
    const { store, client } = setup(false);

    await store.search(query);
    await store.search(query);

    expect(client.collectionExists).toHaveBeenCalledTimes(1);
    expect(client.createCollection).toHaveBeenCalledWith('knowledge', {
      vectors: { dense: { size: 4, distance: 'Cosine' } },
      sparse_vectors: { sparse: { modifier: 'idf' } },
    });
    expect(
      client.createPayloadIndex.mock.calls.map(
        ([, { field_name }]) => field_name,
      ),
    ).toEqual(['resourceId', 'version']);
  });

  it('should retry creating the collection after a failure', async () => {
    const { store, client } = setup();
    client.collectionExists.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(store.search(query)).rejects.toThrow('ECONNREFUSED');
    await store.search(query);

    expect(client.collectionExists).toHaveBeenCalledTimes(2);
  });

  it('should fuse dense and sparse results with RRF and map payloads', async () => {
    const { store, client } = setup();

    const chunks = await store.search(query);

    expect(client.query).toHaveBeenCalledWith('knowledge', {
      prefetch: [
        { query: query.dense, using: 'dense', limit: 40 },
        { query: query.sparse, using: 'sparse', limit: 40 },
      ],
      query: { fusion: 'rrf' },
      limit: 20,
      with_payload: true,
    });
    expect(chunks).toEqual([
      {
        id: 'point-1',
        score: 0.03,
        relevance: null,
        resourceId: 'resource-1',
        resourceTitle: 'Shipping',
        headingPath: ['Delivery'],
        chunkIndex: 2,
        text: 'Three to five days.',
        context: 'Delivery times within the EU.',
      },
    ]);
  });

  it('should search dense vectors only when hybrid is off or there are no keywords', async () => {
    const { store, client } = setup();

    await store.search({ ...query, hybrid: false });
    await store.search({ ...query, sparse: { indices: [], values: [] } });

    for (const [, request] of client.query.mock.calls) {
      expect(request).toEqual({
        query: query.dense,
        using: 'dense',
        limit: 20,
        with_payload: true,
      });
    }
  });

  it('should upsert a new version before deleting older ones', async () => {
    const { store, client } = setup();
    const chunks: IndexedChunk[] = Array.from({ length: 70 }, (_, index) => ({
      payload: {
        resourceId: 'resource-1',
        resourceTitle: 'Shipping',
        headingPath: [],
        chunkIndex: index,
        text: `chunk ${index}`,
        context: null,
      },
      dense: query.dense,
      sparse: query.sparse,
    }));

    const version = await store.replaceResource('resource-1', chunks);

    expect(client.upsert).toHaveBeenCalledTimes(2);
    const points = client.upsert.mock.calls.flatMap(([, { points }]) => points);
    expect(points).toHaveLength(70);
    expect(points[0]).toEqual({
      id: expect.any(String),
      vector: { dense: query.dense, sparse: query.sparse },
      payload: expect.objectContaining({ chunkIndex: 0, version }),
    });
    expect(client.delete).toHaveBeenCalledWith('knowledge', {
      wait: true,
      filter: {
        must: [{ key: 'resourceId', match: { value: 'resource-1' } }],
        must_not: [{ key: 'version', match: { value: version } }],
      },
    });
    expect(client.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.upsert.mock.invocationCallOrder[1],
    );
  });
});
