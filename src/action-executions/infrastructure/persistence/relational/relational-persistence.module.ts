import { Module } from '@nestjs/common';
import { ActionExecutionRepository } from '../action-execution.repository';
import { ActionExecutionRelationalRepository } from './repositories/action-execution.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionExecutionEntity } from './entities/action-execution.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionExecutionEntity])],
  providers: [
    {
      provide: ActionExecutionRepository,
      useClass: ActionExecutionRelationalRepository,
    },
  ],
  exports: [ActionExecutionRepository],
})
export class RelationalActionExecutionPersistenceModule {}
