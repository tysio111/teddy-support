export const KNOWLEDGE_INDEX_REQUESTED_EVENT = 'knowledge-index.requested';

export class KnowledgeIndexRequestedEvent {
  constructor(public readonly resourceId: string) {}
}
