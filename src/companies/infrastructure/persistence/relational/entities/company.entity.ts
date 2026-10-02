import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'company',
})
export class CompanyEntity extends EntityRelationalHelper {
  @Index({ unique: true })
  @Column({
    nullable: true,
    type: String,
  })
  apiKey?: string | null;

  @Column({
    nullable: true,
    type: Number,
  })
  confidenceThreshold?: number | null;

  @Column({
    nullable: false,
    type: String,
  })
  status: string;

  @Index({ unique: true })
  @Column({
    nullable: false,
    type: String,
  })
  slug: string;

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
