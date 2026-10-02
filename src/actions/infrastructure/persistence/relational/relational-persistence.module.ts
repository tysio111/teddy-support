import { Module } from '@nestjs/common';
import { ActionRepository } from '../action.repository';
import { ActionRelationalRepository } from './repositories/action.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionEntity } from './entities/action.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionEntity])],
  providers: [
    {
      provide: ActionRepository,
      useClass: ActionRelationalRepository,
    },
  ],
  exports: [ActionRepository],
})
export class RelationalActionPersistenceModule {}
