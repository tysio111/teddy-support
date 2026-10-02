import { ActionEntity } from '../../../../../actions/infrastructure/persistence/relational/entities/action.entity';

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
  name: 'action_parameter',
})
export class ActionParameterEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Number,
  })
  order: number;

  @Column({
    nullable: true,
    type: String,
  })
  enumValues?: string | null;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isRequired: boolean;

  @Column({
    nullable: false,
    type: String,
  })
  description: string;

  @Column({
    nullable: false,
    type: String,
  })
  type: string;

  @Column({
    nullable: false,
    type: String,
  })
  name: string;

  @Index()
  @ManyToOne(() => ActionEntity, { eager: true, nullable: false })
  action: ActionEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
