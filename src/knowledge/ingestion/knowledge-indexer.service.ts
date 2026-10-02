import {
  ConflictException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FilesService } from '../../files/files.service';
import { Resource } from '../../resources/domain/resource';
import { ResourceIndexStatusEnum } from '../../resources/resource-index-status.enum';
import { ResourcesService } from '../../resources/resources.service';
import { KnowledgeConfig } from '../config/knowledge-config.type';
import {
  KNOWLEDGE_INDEX_REQUESTED_EVENT,
  KnowledgeIndexRequestedEvent,
} from '../events/knowledge-index-requested.event';
import { KnowledgeLlmService } from '../llm/knowledge-llm.service';
import { DenseEmbedder } from '../retrieval/dense-embedder';
import { SparseEncoder } from '../retrieval/sparse-encoder';
import { IndexedChunk, KnowledgeVectorStore } from '../retrieval/vector-store';
import { chunkMarkdown, TextChunk } from './chunker';
import { extractDocumentText, isIndexable } from './document-text';

// Chunks per contextualization call; the document itself is prompt-cached.
const CONTEXT_BATCH = 20;
// Above this the document no longer fits comfortably next to the chunks in
// the fast model's context window; chunks are indexed without context.
const MAX_CONTEXT_DOCUMENT_CHARS = 400_000;

export class KnowledgeIndexerService {
  private readonly logger = new Logger(KnowledgeIndexerService.name);

  constructor(
    private readonly config: KnowledgeConfig,
    private readonly resourcesService: ResourcesService,
    private readonly filesService: FilesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly llm: KnowledgeLlmService,
    private readonly embedder: DenseEmbedder,
    private readonly sparseEncoder: SparseEncoder,
    private readonly store: KnowledgeVectorStore,
  ) {}

  // Validates the resource and queues indexing, which runs in the
  // background (see KnowledgeListener).
  async requestIndexing(id: Resource['id']): Promise<Resource> {
    const resource = await this.resourcesService.findById(id);
    if (!resource) {
      throw new NotFoundException();
    }
    if (!resource.file || !isIndexable(resource.file.path)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'unsupportedDocument',
        },
      });
    }
    if (resource.indexStatus === ResourceIndexStatusEnum.indexing) {
      throw new ConflictException('Indexing is already running');
    }

    const updated = await this.resourcesService.update(id, {
      indexStatus: ResourceIndexStatusEnum.indexing,
      indexError: null,
    });
    this.eventEmitter.emit(
      KNOWLEDGE_INDEX_REQUESTED_EVENT,
      new KnowledgeIndexRequestedEvent(id),
    );

    return updated ?? resource;
  }

  // Replaces the resource's chunks in the knowledge base. Never throws:
  // failures are recorded on the resource.
  async index(id: Resource['id']): Promise<void> {
    try {
      const resource = await this.resourcesService.findById(id);
      if (!resource?.file) {
        throw new Error('Resource has no file');
      }

      const text = await extractDocumentText(
        resource.file.path,
        await this.filesService.getContent(resource.file),
      );
      const chunks = chunkMarkdown(text, {
        chunkTokens: this.config.chunkTokens,
        overlapTokens: this.config.chunkOverlapTokens,
      });
      if (!chunks.length) {
        throw new Error('The document produced no chunks');
      }

      const contexts = await this.contextualize(resource, text, chunks);
      const embeddingTexts = chunks.map((chunk, index) =>
        embeddingText(resource.title, chunk, contexts.get(index) ?? null),
      );
      const dense = await this.embedder.embedDocuments(embeddingTexts);

      const indexed: IndexedChunk[] = chunks.map((chunk, index) => ({
        payload: {
          resourceId: resource.id,
          resourceTitle: resource.title,
          headingPath: chunk.headingPath,
          chunkIndex: index,
          text: chunk.text,
          context: contexts.get(index) ?? null,
        },
        dense: dense[index],
        sparse: this.sparseEncoder.encode(embeddingTexts[index]),
      }));
      const version = await this.store.replaceResource(resource.id, indexed);

      await this.resourcesService.update(id, {
        indexStatus: ResourceIndexStatusEnum.indexed,
        vectorRef: version,
      });
      this.logger.log(`Resource ${id}: indexed ${chunks.length} chunks`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Knowledge indexing failed for resource ${id}`,
        error instanceof Error ? error.stack : message,
      );
      await this.resourcesService
        .update(id, {
          indexStatus: ResourceIndexStatusEnum.failed,
          indexError: message,
        })
        .catch(() => undefined);
    }
  }

  async removeFromIndex(id: Resource['id']): Promise<void> {
    const resource = await this.resourcesService.findById(id);
    if (!resource) {
      throw new NotFoundException();
    }

    await this.store.deleteResource(id);
    await this.resourcesService.update(id, {
      indexStatus: null,
      indexError: null,
      vectorRef: null,
    });
  }

  // Best effort: a chunk without context is still searchable.
  private async contextualize(
    resource: Resource,
    document: string,
    chunks: TextChunk[],
  ): Promise<Map<number, string>> {
    const contexts = new Map<number, string>();
    if (!this.config.contextualChunks) {
      return contexts;
    }
    if (document.length > MAX_CONTEXT_DOCUMENT_CHARS) {
      this.logger.warn(
        `Resource ${resource.id}: document too long for chunk context, skipping it`,
      );
      return contexts;
    }

    for (let start = 0; start < chunks.length; start += CONTEXT_BATCH) {
      const batch = chunks
        .slice(start, start + CONTEXT_BATCH)
        .map((chunk, offset) => ({ index: start + offset, text: chunk.text }));
      try {
        const result = await this.llm.contextualizeChunks({
          title: resource.title,
          document,
          chunks: batch,
        });
        for (const { index } of batch) {
          const context = result.get(index);
          if (context) {
            contexts.set(index, context);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Resource ${resource.id}: chunk context failed for chunks ${start}-${start + batch.length - 1}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return contexts;
  }
}

// What gets embedded: the chunk plus where it sits, so a chunk that only
// says "Allow 3-5 business days" is found for "delivery time".
export function embeddingText(
  title: string,
  { headingPath, text }: TextChunk,
  context: string | null,
): string {
  return [[title, ...headingPath].join(' > '), context, text]
    .filter(Boolean)
    .join('\n\n');
}
