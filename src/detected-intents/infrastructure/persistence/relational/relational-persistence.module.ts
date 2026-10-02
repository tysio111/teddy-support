import { Module } from '@nestjs/common';
import { DetectedIntentRepository } from '../detected-intent.repository';
import { DetectedIntentRelationalRepository } from './repositories/detected-intent.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetectedIntentEntity } from './entities/detected-intent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetectedIntentEntity])],
  providers: [
    {
      provide: DetectedIntentRepository,
      useClass: DetectedIntentRelationalRepository,
    },
  ],
  exports: [DetectedIntentRepository],
})
export class RelationalDetectedIntentPersistenceModule {}
