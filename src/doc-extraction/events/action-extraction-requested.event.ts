export const ACTION_EXTRACTION_REQUESTED_EVENT = 'action-extraction.requested';

export class ActionExtractionRequestedEvent {
  constructor(public readonly resourceId: string) {}
}
