import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AllConfigType } from '../config/config.type';
import { PiiRedactor } from '../privacy/pii/pii-redactor';
import { FilesService } from '../files/files.service';
import { ResourcesService } from '../resources/resources.service';
import { KnowledgeIndexerService } from './ingestion/knowledge-indexer.service';
import { createKnowledgeChatModels } from './llm/chat-models';
import { KnowledgeLlmService } from './llm/knowledge-llm.service';
import { KnowledgeService } from './knowledge.service';
import { createDenseEmbedder } from './retrieval/dense-embedder';
import { KnowledgeRetriever } from './retrieval/knowledge-retriever';
import { SparseEncoder } from './retrieval/sparse-encoder';
import { createVectorStore } from './retrieval/vector-store';

// The module's composition root: Nest supplies config and the services of
// other modules, everything internal to the knowledge base is wired here by
// hand. Search and indexing share clients through this token.
const KNOWLEDGE_COMPONENTS = Symbol('KNOWLEDGE_COMPONENTS');

type KnowledgeComponents = {
  knowledgeService: KnowledgeService;
  knowledgeIndexerService: KnowledgeIndexerService;
};

export const knowledgeProviders: Provider[] = [
  {
    provide: KNOWLEDGE_COMPONENTS,
    inject: [ConfigService, ResourcesService, FilesService, EventEmitter2],
    useFactory: (
      configService: ConfigService<AllConfigType>,
      resourcesService: ResourcesService,
      filesService: FilesService,
      eventEmitter: EventEmitter2,
    ): KnowledgeComponents => {
      const config = configService.getOrThrow('knowledge', { infer: true });
      const redactor = new PiiRedactor(
        configService.getOrThrow('privacy', { infer: true })
          .piiRedactionEnabled,
      );
      const llm = new KnowledgeLlmService(
        createKnowledgeChatModels(config),
        redactor,
      );
      const embedder = createDenseEmbedder(config);
      const sparseEncoder = new SparseEncoder(config.language);
      const store = createVectorStore(config);

      return {
        knowledgeService: new KnowledgeService(
          config,
          new KnowledgeRetriever(
            config,
            llm,
            embedder,
            sparseEncoder,
            store,
            redactor,
          ),
          llm,
        ),
        knowledgeIndexerService: new KnowledgeIndexerService(
          config,
          resourcesService,
          filesService,
          eventEmitter,
          llm,
          embedder,
          sparseEncoder,
          store,
        ),
      };
    },
  },
  {
    provide: KnowledgeService,
    inject: [KNOWLEDGE_COMPONENTS],
    useFactory: ({ knowledgeService }: KnowledgeComponents) => knowledgeService,
  },
  {
    provide: KnowledgeIndexerService,
    inject: [KNOWLEDGE_COMPONENTS],
    useFactory: ({ knowledgeIndexerService }: KnowledgeComponents) =>
      knowledgeIndexerService,
  },
];
