import { CompanyEntity } from '../../../../../companies/infrastructure/persistence/relational/entities/company.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  Index,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'client',
})
export class ClientEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  email?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  name?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  externalReference?: string | null;

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
