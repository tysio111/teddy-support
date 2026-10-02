import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MessageSenderEnum } from '../../messages/message-sender.enum';

export class ConversationTurnDto {
  @ApiProperty({ enum: MessageSenderEnum })
  @IsEnum(MessageSenderEnum)
  sender: MessageSenderEnum;

  @ApiProperty()
  @IsString()
  content: string;
}

export class QueryKnowledgeDto {
  @ApiProperty({ example: 'How long does delivery to Germany take?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({
    type: () => [ConversationTurnDto],
    description: 'Earlier turns of the conversation, oldest first',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationTurnDto)
  history?: ConversationTurnDto[];

  // Overrides of the configured pipeline, for ablations.
  @ApiPropertyOptional({ description: 'Dense + sparse search (default true)' })
  @IsOptional()
  @IsBoolean()
  hybrid?: boolean;

  @ApiPropertyOptional({ description: 'Defaults to KNOWLEDGE_HYDE_ENABLED' })
  @IsOptional()
  @IsBoolean()
  hyde?: boolean;

  @ApiPropertyOptional({ description: 'Defaults to KNOWLEDGE_RERANK_ENABLED' })
  @IsOptional()
  @IsBoolean()
  rerank?: boolean;
}
