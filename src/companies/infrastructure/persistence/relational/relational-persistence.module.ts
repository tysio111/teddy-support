import { Module } from '@nestjs/common';
import { CompanyRepository } from '../company.repository';
import { CompanyRelationalRepository } from './repositories/company.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyEntity } from './entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity])],
  providers: [
    {
      provide: CompanyRepository,
      useClass: CompanyRelationalRepository,
    },
  ],
  exports: [CompanyRepository],
})
export class RelationalCompanyPersistenceModule {}
