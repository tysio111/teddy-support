import { ActionEntity } from '../../../../../actions/infrastructure/persistence/relational/entities/action.entity';

import { MessageEntity } from '../../../../../messages/infrastructure/persistence/relational/entities/message.entity';

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
  name: 'detected_intent',
})
export class DetectedIntentEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  extractedParameters?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  status?: string;

  @Column({
    nullable: false,
    type: Number,
  })
  rank?: number;

  @Column({
    nullable: false,
    type: Number,
  })
  confidenceScore?: number;

  @Index()
  @ManyToOne(() => ActionEntity, { eager: true, nullable: true })
  action?: ActionEntity | null;

  @Index()
  @ManyToOne(() => MessageEntity, { eager: true, nullable: false })
  message?: MessageEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
