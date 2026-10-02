import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class Company {
  @Exclude({ toPlainOnly: true })
  apiKey?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  confidenceThreshold?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  slug: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  name: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
