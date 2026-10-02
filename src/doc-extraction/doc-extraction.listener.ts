import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DocExtractionService } from './doc-extraction.service';
import {
  ACTION_EXTRACTION_REQUESTED_EVENT,
  ActionExtractionRequestedEvent,
} from './events/action-extraction-requested.event';

@Injectable()
export class DocExtractionListener {
  constructor(private readonly docExtractionService: DocExtractionService) {}

  // Fire-and-forget: runs after the HTTP response.
  @OnEvent(ACTION_EXTRACTION_REQUESTED_EVENT, { async: true })
  handleExtractionRequested(
    event: ActionExtractionRequestedEvent,
  ): Promise<void> {
    return this.docExtractionService.extract(event.resourceId);
  }
}
