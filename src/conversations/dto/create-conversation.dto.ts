import { ClientDto } from '../../clients/dto/client.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateConversationDto {
  lastMessageAt?: Date | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  status: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  channel: string;

  @ApiProperty({
    required: false,
    type: () => ClientDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientDto)
  @IsNotEmptyObject()
  client?: ClientDto | null;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
