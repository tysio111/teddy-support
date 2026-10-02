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
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  externalReference?: string | null;

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
