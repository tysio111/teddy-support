import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { ClientEntity } from '../../../../../clients/infrastructure/persistence/relational/entities/client.entity';

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
  name: 'conversation',
})
export class ConversationEntity extends EntityRelationalHelper {
  @ManyToOne(() => UserEntity, { eager: true, nullable: true })
  assignee?: UserEntity | null;

  @Column({
    nullable: true,
    type: Date,
  })
  lastMessageAt?: Date | null;

  @Index()
  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Column({
    nullable: false,
    type: String,
  })
  channel: string;

  @ManyToOne(() => ClientEntity, { eager: true, nullable: true })
  client?: ClientEntity | null;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
