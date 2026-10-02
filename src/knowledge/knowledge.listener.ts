import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  KNOWLEDGE_INDEX_REQUESTED_EVENT,
  KnowledgeIndexRequestedEvent,
} from './events/knowledge-index-requested.event';
import { KnowledgeIndexerService } from './ingestion/knowledge-indexer.service';

@Injectable()
export class KnowledgeListener {
  constructor(
    private readonly knowledgeIndexerService: KnowledgeIndexerService,
  ) {}

  // Fire-and-forget: runs after the HTTP response.
  @OnEvent(KNOWLEDGE_INDEX_REQUESTED_EVENT, { async: true })
  handleIndexRequested(event: KnowledgeIndexRequestedEvent): Promise<void> {
    return this.knowledgeIndexerService.index(event.resourceId);
  }
}
