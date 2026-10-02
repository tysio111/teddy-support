import { ResourceDto } from '../../resources/dto/resource.dto';

import {
  // decorators here

  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

import {
  // decorators here
  Type,
} from 'class-transformer';

export class CreateActionDto {
  @ApiProperty({
    required: false,
    type: () => ResourceDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceDto)
  @IsNotEmptyObject()
  resource?: ResourceDto | null;

  @ApiProperty({
    required: false,
    type: () => Boolean,
  })
  @IsOptional()
  @IsBoolean()
  requiresConfirmation?: boolean;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  status: string;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  confidenceThreshold?: number | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  authCredential?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  authType: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  httpMethod: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  endpointUrl: string;

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
  name: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
