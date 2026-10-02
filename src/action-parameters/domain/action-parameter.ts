import { Action } from '../../actions/domain/action';

import { ApiProperty } from '@nestjs/swagger';

export class ActionParameter {
  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  order: number;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  enumValues?: string | null;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isRequired: boolean;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  description: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  type: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  name: string;

  @ApiProperty({
    type: () => Action,
    nullable: false,
  })
  action: Action;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
