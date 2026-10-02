import { ClientEntity } from '../../../../../clients/infrastructure/persistence/relational/entities/client.entity';

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
  name: 'conversation',
})
export class ConversationEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: Date,
  })
  lastMessageAt?: Date | null;

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
