import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { AllConfigType } from '../config/config.type';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '../messages/events/message-created.event';
import { MessageSenderEnum } from '../messages/message-sender.enum';
import { IntentGraphService } from './graph/intent-graph.service';

@Injectable()
export class IntentRecognitionListener {
  private readonly logger = new Logger(IntentRecognitionListener.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly intentGraphService: IntentGraphService,
  ) {}

  // Fire-and-forget: runs after the HTTP response and must never throw.
  @OnEvent(MESSAGE_CREATED_EVENT, { async: true })
  async handleMessageCreated(event: MessageCreatedEvent): Promise<void> {
    if (
      event.sender !== MessageSenderEnum.client ||
      !this.configService.get('intentRecognition.enabled', { infer: true })
    ) {
      return;
    }

    try {
      const state = await this.intentGraphService.run({
        messageId: event.messageId,
        companyId: event.companyId,
      });

      this.logger.log(
        `Message ${event.messageId}: ${state.outcome}` +
          (state.topIntent ? ` (detectedIntent ${state.topIntent.id})` : ''),
      );
    } catch (error) {
      this.logger.error(
        `Intent recognition failed for message ${event.messageId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
