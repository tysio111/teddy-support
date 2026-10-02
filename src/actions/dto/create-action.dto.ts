import { CompanyDto } from '../../companies/dto/company.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateActionDto {
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

  @ApiProperty({
    required: true,
    type: () => CompanyDto,
  })
  @ValidateNested()
  @Type(() => CompanyDto)
  @IsNotEmptyObject()
  company: CompanyDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
