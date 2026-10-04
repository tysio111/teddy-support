import { User } from '../../users/domain/user';
import { Exclude } from 'class-transformer';
import { Client } from '../../clients/domain/client';
import { ConversationStatusEnum } from '../conversation-status.enum';

import { ApiProperty } from '@nestjs/swagger';

export class Conversation {
  // Estimated LLM spend of the intent graph on this conversation, checked
  // against the per-conversation cost budget. Updated with `addLlmUsage`.
  @Exclude({ toPlainOnly: true })
  llmCostUsd?: number;

  @Exclude({ toPlainOnly: true })
  llmOutputTokens?: number;

  @Exclude({ toPlainOnly: true })
  llmInputTokens?: number;

  // The agent who owns the conversation while it is handed off.
  @ApiProperty({
    type: () => User,
    nullable: true,
  })
  assignee?: User | null;

  @Exclude({ toPlainOnly: true })
  lastMessageAt?: Date | null;

  @ApiProperty({
    enum: ConversationStatusEnum,
    nullable: false,
  })
  status: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  channel: string;

  @ApiProperty({
    type: () => Client,
    nullable: true,
  })
  client?: Client | null;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
