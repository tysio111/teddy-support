import { ResourceEntity } from '../../../../../resources/infrastructure/persistence/relational/entities/resource.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'action',
})
export class ActionEntity extends EntityRelationalHelper {
  @ManyToOne(() => ResourceEntity, {
    eager: false,
    nullable: true,
    // Actions outlive the document they were extracted from.
    onDelete: 'SET NULL',
  })
  resource?: ResourceEntity | null;

  @Column({
    nullable: false,
    type: Boolean,
    default: false,
  })
  requiresConfirmation?: boolean;

  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: true,
    type: 'double precision',
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

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
