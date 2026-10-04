import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { ConversationEntity } from '../../../../../conversations/infrastructure/persistence/relational/entities/conversation.entity';

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
  name: 'handoff',
})
export class HandoffEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: Date,
  })
  closedAt?: Date | null;

  @Column({
    nullable: true,
    type: Date,
  })
  assignedAt?: Date | null;

  @ManyToOne(() => UserEntity, { eager: true, nullable: true })
  assignee?: UserEntity | null;

  @Column({
    nullable: true,
    type: String,
  })
  context?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  summaryStatus?: string;

  @Column({
    nullable: true,
    type: String,
  })
  summary?: string | null;

  @Index()
  @Column({
    nullable: false,
    type: String,
  })
  status?: string;

  @Column({
    nullable: false,
    type: String,
  })
  reason?: string;

  @Index()
  @ManyToOne(() => ConversationEntity, { eager: true, nullable: false })
  conversation?: ConversationEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
