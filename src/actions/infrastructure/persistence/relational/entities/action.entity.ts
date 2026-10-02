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
  name: 'action',
})
export class ActionEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: true,
    type: Number,
  })
  confidenceThreshold?: number | null;

  @Column({
    nullable: true,
    type: String,
  })
  authCredential?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  authType: string;

  @Column({
    nullable: false,
    type: String,
  })
  httpMethod: string;

  @Column({
    nullable: false,
    type: String,
  })
  endpointUrl: string;

  @Column({
    nullable: false,
    type: String,
  })
  description: string;

  @Column({
    nullable: false,
    type: String,
  })
  name: string;

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
