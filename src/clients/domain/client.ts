import { Company } from '../../companies/domain/company';

import { ApiProperty } from '@nestjs/swagger';

export class Client {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  email?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  name?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  externalReference?: string | null;

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
