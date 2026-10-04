import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  HANDOFF_OPENED_EVENT,
  HandoffOpenedEvent,
} from './events/handoff-opened.event';
import { HandoffsService } from './handoffs.service';

@Injectable()
export class HandoffSummaryListener {
  constructor(private readonly handoffsService: HandoffsService) {}

  // Fire-and-forget: the escalation reply is not delayed by the LLM call.
  @OnEvent(HANDOFF_OPENED_EVENT, { async: true })
  handleHandoffOpened(event: HandoffOpenedEvent): Promise<void> {
    return this.handoffsService.summarize(event.handoffId);
  }
}
