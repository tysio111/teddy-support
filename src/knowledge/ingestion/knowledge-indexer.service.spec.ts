import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FilesService } from '../../files/files.service';
import { ResourcesService } from '../../resources/resources.service';
import { KnowledgeConfig } from '../config/knowledge-config.type';
import { KNOWLEDGE_INDEX_REQUESTED_EVENT } from '../events/knowledge-index-requested.event';
import { KnowledgeLlmService } from '../llm/knowledge-llm.service';
import { DenseEmbedder } from '../retrieval/dense-embedder';
import { SparseEncoder } from '../retrieval/sparse-encoder';
import { IndexedChunk, KnowledgeVectorStore } from '../retrieval/vector-store';
import {
  embeddingText,
  KnowledgeIndexerService,
} from './knowledge-indexer.service';

const document = `# Shipping
We ship to the EU.

## Delivery times
Three to five business days.`;

describe('KnowledgeIndexerService', () => {
  function setup(resource: Record<string, unknown> | null = {}) {
    const resourcesService = {
      findById: jest.fn().mockResolvedValue(
        resource && {
          id: 'resource-1',
          title: 'Help center',
          file: { id: 'file-1', path: '/api/v1/files/help.md' },
          ...resource,
        },
      ),
      update: jest
        .fn()
        .mockImplementation((id, payload) =>
          Promise.resolve({ id, ...payload }),
        ),
    };
    const filesService = {
      getContent: jest.fn().mockResolvedValue(Buffer.from(document)),
    };
    const eventEmitter = { emit: jest.fn() };
    const llm = {
      contextualizeChunks: jest.fn().mockResolvedValue(
        new Map([
          [0, 'Shipping overview.'],
          [1, 'Delivery times for EU orders.'],
        ]),
      ),
    };
    const embedder = {
      embedDocuments: jest
        .fn()
        .mockImplementation((texts: string[]) =>
          Promise.resolve(texts.map(() => [0.1, 0.2])),
        ),
    };
    const store = {
      replaceResource: jest.fn().mockResolvedValue('version-1'),
      deleteResource: jest.fn().mockResolvedValue(undefined),
    };
    const service = new KnowledgeIndexerService(
      {
        chunkTokens: 500,
        chunkOverlapTokens: 50,
        contextualChunks: true,
      } as KnowledgeConfig,
      resourcesService as unknown as ResourcesService,
      filesService as unknown as FilesService,
      eventEmitter as unknown as EventEmitter2,
      llm as unknown as KnowledgeLlmService,
      embedder as unknown as DenseEmbedder,
      new SparseEncoder(),
      store as unknown as KnowledgeVectorStore,
    );

    return { service, resourcesService, eventEmitter, llm, embedder, store };
  }

  describe('requestIndexing', () => {
    it('should mark the resource as indexing and queue the job', async () => {
      const { service, resourcesService, eventEmitter } = setup();

      await service.requestIndexing('resource-1');

      expect(resourcesService.update).toHaveBeenCalledWith('resource-1', {
        indexStatus: 'indexing',
        indexError: null,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        KNOWLEDGE_INDEX_REQUESTED_EVENT,
        { resourceId: 'resource-1' },
      );
    });

    it('should reject missing resources and unsupported files', async () => {
      await expect(setup(null).service.requestIndexing('x')).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        setup({ file: { path: '/files/image.png' } }).service.requestIndexing(
          'resource-1',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should not start twice', async () => {
      const { service } = setup({ indexStatus: 'indexing' });

      await expect(service.requestIndexing('resource-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('index', () => {
    it('should chunk, contextualize, embed and store the document', async () => {
      const { service, resourcesService, embedder, store } = setup();

      await service.index('resource-1');

      const [resourceId, chunks] = store.replaceResource.mock.calls[0] as [
        string,
        IndexedChunk[],
      ];
      expect(resourceId).toBe('resource-1');
      expect(chunks.map(({ payload }) => payload)).toEqual([
        {
          resourceId: 'resource-1',
          resourceTitle: 'Help center',
          headingPath: ['Shipping'],
          chunkIndex: 0,
          text: 'We ship to the EU.',
          context: 'Shipping overview.',
        },
        {
          resourceId: 'resource-1',
          resourceTitle: 'Help center',
          headingPath: ['Shipping', 'Delivery times'],
          chunkIndex: 1,
          text: 'Three to five business days.',
          context: 'Delivery times for EU orders.',
        },
      ]);
      expect(embedder.embedDocuments).toHaveBeenCalledWith([
        'Help center > Shipping\n\nShipping overview.\n\nWe ship to the EU.',
        'Help center > Shipping > Delivery times\n\nDelivery times for EU orders.\n\nThree to five business days.',
      ]);
      expect(resourcesService.update).toHaveBeenCalledWith('resource-1', {
        indexStatus: 'indexed',
        vectorRef: 'version-1',
      });
    });

    it('should index without context when contextualization fails', async () => {
      const { service, llm, store, resourcesService } = setup();
      llm.contextualizeChunks.mockRejectedValue(new Error('overloaded'));

      await service.index('resource-1');

      const [, chunks] = store.replaceResource.mock.calls[0] as [
        string,
        IndexedChunk[],
      ];
      expect(chunks.every(({ payload }) => payload.context === null)).toBe(
        true,
      );
      expect(resourcesService.update).toHaveBeenCalledWith(
        'resource-1',
        expect.objectContaining({ indexStatus: 'indexed' }),
      );
    });

    it('should record failures on the resource instead of throwing', async () => {
      const { service, embedder, store, resourcesService } = setup();
      embedder.embedDocuments.mockRejectedValue(new Error('Voyage is down'));

      await expect(service.index('resource-1')).resolves.toBeUndefined();

      expect(store.replaceResource).not.toHaveBeenCalled();
      expect(resourcesService.update).toHaveBeenCalledWith('resource-1', {
        indexStatus: 'failed',
        indexError: 'Voyage is down',
      });
    });
  });

  it('should remove the resource from the index', async () => {
    const { service, store, resourcesService } = setup();

    await service.removeFromIndex('resource-1');

    expect(store.deleteResource).toHaveBeenCalledWith('resource-1');
    expect(resourcesService.update).toHaveBeenCalledWith('resource-1', {
      indexStatus: null,
      indexError: null,
      vectorRef: null,
    });
  });

  it('should embed the section path and context next to the text', () => {
    expect(
      embeddingText('Guide', { headingPath: [], text: 'Body' }, null),
    ).toBe('Guide\n\nBody');
  });
});
