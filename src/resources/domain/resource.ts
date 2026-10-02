import { Exclude } from 'class-transformer';
import { FileType } from '../../files/domain/file';

import { ApiProperty } from '@nestjs/swagger';

export class Resource {
  // Read-only: set by knowledge indexing.
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  indexError?: string | null;

  // Read-only: see ResourceIndexStatusEnum.
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  indexStatus?: string | null;

  // Read-only: set by action extraction.
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  extractionError?: string | null;

  @Exclude({ toPlainOnly: true })
  vectorRef?: string | null;

  // Read-only: see ResourceStatusEnum.
  @ApiProperty({
    type: () => String,
  })
  status?: string;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  sourceUrl?: string | null;

  @ApiProperty({
    type: () => FileType,
    nullable: true,
  })
  file?: FileType | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  type: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  title: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
