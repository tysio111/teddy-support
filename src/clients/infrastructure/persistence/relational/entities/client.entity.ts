import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
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

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
