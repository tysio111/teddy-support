import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';
import { Resource } from '../../resources/domain/resource';
import { ChunkPayload, RetrievedChunk } from '../knowledge.types';
import { SparseVector } from './sparse-encoder';

const DENSE = 'dense';
const SPARSE = 'sparse';
const UPSERT_BATCH = 64;

export type IndexedChunk = {
  payload: ChunkPayload;
  dense: number[];
  sparse: SparseVector;
};

export type SearchQuery = {
  dense: number[];
  sparse: SparseVector;
  // Candidates per search (dense, sparse) before fusion.
  prefetchLimit: number;
  limit: number;
  // Dense + sparse fused with RRF; false searches dense vectors only.
  hybrid: boolean;
};

// Stored next to ChunkPayload: lets a re-index swap versions without a
// window where the resource has no chunks.
type StoredPayload = ChunkPayload & { version: string };

export class KnowledgeVectorStore {
  private ready: Promise<void> | null = null;

  constructor(
    private readonly client: QdrantClient,
    private readonly collection: string,
    private readonly dimension: number,
  ) {}

  /**
   * Upserts the new chunks under a fresh version, then deletes every older
   * version of the resource. Returns the version (stored as vectorRef).
   */
  async replaceResource(
    resourceId: Resource['id'],
    chunks: IndexedChunk[],
  ): Promise<string> {
    await this.ensureCollection();
    const version = randomUUID();

    for (let i = 0; i < chunks.length; i += UPSERT_BATCH) {
      await this.client.upsert(this.collection, {
        wait: true,
        points: chunks
          .slice(i, i + UPSERT_BATCH)
          .map(({ payload, dense, sparse }) => ({
            id: randomUUID(),
            vector: { [DENSE]: dense, [SPARSE]: sparse },
            payload: { ...payload, version } satisfies StoredPayload,
          })),
      });
    }

    await this.client.delete(this.collection, {
      wait: true,
      filter: {
        must: [{ key: 'resourceId', match: { value: resourceId } }],
        must_not: [{ key: 'version', match: { value: version } }],
      },
    });

    return version;
  }

  async deleteResource(resourceId: Resource['id']): Promise<void> {
    await this.ensureCollection();
    await this.client.delete(this.collection, {
      wait: true,
      filter: { must: [{ key: 'resourceId', match: { value: resourceId } }] },
    });
  }

  async search({
    dense,
    sparse,
    prefetchLimit,
    limit,
    hybrid,
  }: SearchQuery): Promise<RetrievedChunk[]> {
    await this.ensureCollection();

    // A query with no words (e.g. only emoji) has an empty sparse vector.
    const useSparse = hybrid && sparse.indices.length > 0;
    const { points } = await this.client.query(
      this.collection,
      useSparse
        ? {
            prefetch: [
              { query: dense, using: DENSE, limit: prefetchLimit },
              { query: sparse, using: SPARSE, limit: prefetchLimit },
            ],
            query: { fusion: 'rrf' },
            limit,
            with_payload: true,
          }
        : { query: dense, using: DENSE, limit, with_payload: true },
    );

    return points.map(({ id, score, payload }) => {
      const stored = payload as unknown as StoredPayload;
      return {
        id: String(id),
        score,
        relevance: null,
        resourceId: stored.resourceId,
        resourceTitle: stored.resourceTitle,
        headingPath: stored.headingPath,
        chunkIndex: stored.chunkIndex,
        text: stored.text,
        context: stored.context,
      };
    });
  }

  private ensureCollection(): Promise<void> {
    // Memoized, but retried on the next call if it failed (e.g. Qdrant down).
    this.ready ??= this.createCollectionIfMissing().catch((error) => {
      this.ready = null;
      throw error;
    });
    return this.ready;
  }

  private async createCollectionIfMissing(): Promise<void> {
    const { exists } = await this.client.collectionExists(this.collection);
    if (exists) {
      return;
    }

    await this.client.createCollection(this.collection, {
      vectors: { [DENSE]: { size: this.dimension, distance: 'Cosine' } },
      // Qdrant computes IDF over the collection; the encoder sends raw
      // term frequencies.
      sparse_vectors: { [SPARSE]: { modifier: 'idf' } },
    });
    for (const field of ['resourceId', 'version']) {
      await this.client.createPayloadIndex(this.collection, {
        field_name: field,
        field_schema: 'keyword',
        wait: true,
      });
    }
  }
}

export function createVectorStore(config: {
  qdrantUrl: string;
  qdrantApiKey?: string;
  collection: string;
  embeddingDimension: number;
}): KnowledgeVectorStore {
  return new KnowledgeVectorStore(
    new QdrantClient({ url: config.qdrantUrl, apiKey: config.qdrantApiKey }),
    config.collection,
    config.embeddingDimension,
  );
}
