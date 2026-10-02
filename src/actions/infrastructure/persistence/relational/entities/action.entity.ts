import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'action',
})
export class ActionEntity extends EntityRelationalHelper {
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

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
