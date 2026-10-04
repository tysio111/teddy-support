import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class OpenHandoffDto {
  @ApiProperty({ description: 'Conversation to escalate manually' })
  @IsUUID()
  conversationId: string;
}
