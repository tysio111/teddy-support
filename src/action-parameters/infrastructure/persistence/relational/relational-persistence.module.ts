import { Module } from '@nestjs/common';
import { ActionParameterRepository } from '../action-parameter.repository';
import { ActionParameterRelationalRepository } from './repositories/action-parameter.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionParameterEntity } from './entities/action-parameter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionParameterEntity])],
  providers: [
    {
      provide: ActionParameterRepository,
      useClass: ActionParameterRelationalRepository,
    },
  ],
  exports: [ActionParameterRepository],
})
export class RelationalActionParameterPersistenceModule {}
