import { Company } from '../../companies/domain/company';

import { ApiProperty } from '@nestjs/swagger';

export class Action {
  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  confidenceThreshold?: number | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  authCredential?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  authType: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  httpMethod: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  endpointUrl: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  description: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  name: string;

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
