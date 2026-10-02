import { Module } from '@nestjs/common';
import { ResourceRepository } from '../resource.repository';
import { ResourceRelationalRepository } from './repositories/resource.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceEntity } from './entities/resource.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceEntity])],
  providers: [
    {
      provide: ResourceRepository,
      useClass: ResourceRelationalRepository,
    },
  ],
  exports: [ResourceRepository],
})
export class RelationalResourcePersistenceModule {}
