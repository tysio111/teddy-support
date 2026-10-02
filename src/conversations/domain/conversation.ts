import { Exclude } from 'class-transformer';
import { Client } from '../../clients/domain/client';

import { Company } from '../../companies/domain/company';

import { ApiProperty } from '@nestjs/swagger';

export class Conversation {
  @Exclude({ toPlainOnly: true })
  lastMessageAt?: Date | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  channel: string;

  @ApiProperty({
    type: () => Client,
    nullable: true,
  })
  client?: Client | null;

  @ApiProperty({
    type: () => Company,
    nullable: false,
  })
  company: Company;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
