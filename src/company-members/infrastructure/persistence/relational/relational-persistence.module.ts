import { Module } from '@nestjs/common';
import { CompanyMemberRepository } from '../company-member.repository';
import { CompanyMemberRelationalRepository } from './repositories/company-member.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyMemberEntity } from './entities/company-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyMemberEntity])],
  providers: [
    {
      provide: CompanyMemberRepository,
      useClass: CompanyMemberRelationalRepository,
    },
  ],
  exports: [CompanyMemberRepository],
})
export class RelationalCompanyMemberPersistenceModule {}
