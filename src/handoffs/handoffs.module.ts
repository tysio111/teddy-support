import { UsersModule } from '../users/users.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { HandoffsService } from './handoffs.service';
import { HandoffsController } from './handoffs.controller';
import { HandoffSummaryListener } from './handoff-summary.listener';
import { HandoffLlmService } from './llm/handoff-llm.service';
import { PiiRedactor } from '../privacy/pii/pii-redactor';
import { RelationalHandoffPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    ConversationsModule,

    MessagesModule,

    // do not remove this comment
    RelationalHandoffPersistenceModule,
  ],
  controllers: [HandoffsController],
  providers: [
    HandoffsService,
    HandoffSummaryListener,
    {
      provide: HandoffLlmService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) =>
        new HandoffLlmService(
          configService.getOrThrow('handoff', { infer: true }),
          new PiiRedactor(
            configService.getOrThrow('privacy', { infer: true })
              .piiRedactionEnabled,
          ),
        ),
    },
  ],
  exports: [HandoffsService, RelationalHandoffPersistenceModule],
})
export class HandoffsModule {}
