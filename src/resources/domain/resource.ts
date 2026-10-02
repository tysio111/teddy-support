import { Exclude } from 'class-transformer';
import { FileType } from '../../files/domain/file';

import { ApiProperty } from '@nestjs/swagger';

export class Resource {
  @Exclude({ toPlainOnly: true })
  vectorRef?: string | null;

  @Exclude({ toPlainOnly: true })
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
