import { UserDto } from '../../users/dto/user.dto';

import { ClientDto } from '../../clients/dto/client.dto';
import { ConversationStatusEnum } from '../conversation-status.enum';

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
  IsEnum,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateConversationDto {
  assignee?: UserDto | null;

  lastMessageAt?: Date | null;

  @ApiProperty({
    required: false,
    enum: ConversationStatusEnum,
    default: ConversationStatusEnum.open,
  })
  @IsOptional()
  @IsEnum(ConversationStatusEnum)
  status?: ConversationStatusEnum;

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
