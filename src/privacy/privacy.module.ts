import { Module } from '@nestjs/common';
import { IntentRecognitionModule } from '../intent-recognition/intent-recognition.module';
import { ClientDataRepository } from './client-data.repository';
import { ClientDataService } from './client-data.service';
import { DataRetentionScheduler } from './data-retention.scheduler';
import { PrivacyController } from './privacy.controller';

// PII redaction lives in ./pii and is wired where the LLMs and the logger are
// created; this module covers retention and GDPR erasure.
@Module({
  imports: [IntentRecognitionModule],
  controllers: [PrivacyController],
  providers: [ClientDataRepository, ClientDataService, DataRetentionScheduler],
  exports: [ClientDataService],
})
export class PrivacyModule {}
