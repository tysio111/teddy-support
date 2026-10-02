import { ActionEntity } from '../../../../../actions/infrastructure/persistence/relational/entities/action.entity';

import { DetectedIntentEntity } from '../../../../../detected-intents/infrastructure/persistence/relational/entities/detected-intent.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'action_execution',
})
export class ActionExecutionEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: Date,
  })
  executedAt?: Date | null;

  @Column({
    nullable: true,
    type: String,
  })
  errorMessage?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  responsePayload?: string | null;

  @Column({
    nullable: true,
    type: Number,
  })
  responseStatusCode?: number | null;

  @Column({
    nullable: false,
    type: String,
  })
  status?: string;

  @Column({
    nullable: false,
    type: String,
  })
  requestPayload?: string;

  @ManyToOne(() => ActionEntity, { eager: true, nullable: false })
  action?: ActionEntity;

  @ManyToOne(() => DetectedIntentEntity, { eager: true, nullable: false })
  detectedIntent?: DetectedIntentEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
