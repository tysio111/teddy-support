import { FileDto } from '../../files/dto/file.dto';

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

export class CreateResourceDto {
  vectorRef?: string | null;

  status?: string;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  sourceUrl?: string | null;

  @ApiProperty({
    required: false,
    type: () => FileDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileDto)
  @IsNotEmptyObject()
  file?: FileDto | null;

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
  title: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
