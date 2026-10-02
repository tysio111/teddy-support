import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { CompanyEntity } from '../../../../../companies/infrastructure/persistence/relational/entities/company.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  Index,
  Unique,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'company_member',
})
@Unique(['user'])
export class CompanyMemberEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: false,
    type: String,
  })
  role: string;

  @Index()
  @ManyToOne(() => UserEntity, { eager: true, nullable: false })
  user: UserEntity;

  @Index()
  @ManyToOne(() => CompanyEntity, { eager: true, nullable: false })
  company: CompanyEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
