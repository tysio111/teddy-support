import { FileEntity } from '../../../../../files/infrastructure/persistence/relational/entities/file.entity';

import { CompanyEntity } from '../../../../../companies/infrastructure/persistence/relational/entities/company.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'resource',
})
export class ResourceEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  vectorRef?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  status?: string;

  @Column({
    nullable: true,
    type: String,
  })
  sourceUrl?: string | null;

  @OneToOne(() => FileEntity, { eager: true, nullable: true })
  @JoinColumn()
  file?: FileEntity | null;

  @Column({
    nullable: false,
    type: String,
  })
  type: string;

  @Column({
    nullable: false,
    type: String,
  })
  title: string;

  @Index()
  @ManyToOne(() => CompanyEntity, { eager: true, nullable: false })
  company: CompanyEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
