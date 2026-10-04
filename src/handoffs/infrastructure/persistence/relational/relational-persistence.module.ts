import { Module } from '@nestjs/common';
import { HandoffRepository } from '../handoff.repository';
import { HandoffRelationalRepository } from './repositories/handoff.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HandoffEntity } from './entities/handoff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HandoffEntity])],
  providers: [
    {
      provide: HandoffRepository,
      useClass: HandoffRelationalRepository,
    },
  ],
  exports: [HandoffRepository],
})
export class RelationalHandoffPersistenceModule {}
