import { User } from '../../users/domain/user';

import { Company } from '../../companies/domain/company';

import { ApiProperty } from '@nestjs/swagger';

export class CompanyMember {
  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  role: string;

  @ApiProperty({
    type: () => User,
    nullable: false,
  })
  user: User;

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
