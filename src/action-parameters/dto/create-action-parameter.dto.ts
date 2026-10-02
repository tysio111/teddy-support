import { ActionDto } from '../../actions/dto/action.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateActionParameterDto {
  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  order: number;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  enumValues?: string | null;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  description: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  type: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    type: () => ActionDto,
  })
  @ValidateNested()
  @Type(() => ActionDto)
  @IsNotEmptyObject()
  action: ActionDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
