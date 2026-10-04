import { User } from '../../users/domain/user';
import { Conversation } from '../../conversations/domain/conversation';
import { ApiProperty } from '@nestjs/swagger';
import {
  HandoffStatusEnum,
  HandoffSummaryStatusEnum,
} from '../handoff-status.enum';

// One escalation of a conversation to a human agent.
export class Handoff {
  @ApiProperty({
    type: () => Date,
    nullable: true,
  })
  closedAt?: Date | null;

  @ApiProperty({
    type: () => Date,
    nullable: true,
  })
  assignedAt?: Date | null;

  @ApiProperty({
    type: () => User,
    nullable: true,
  })
  assignee?: User | null;

  // JSON (`HandoffContext`): facts collected by the intent graph.
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  context?: string | null;

  @ApiProperty({
    enum: HandoffSummaryStatusEnum,
  })
  summaryStatus?: string;

  // JSON (`HandoffSummary`): written by the LLM after the hand-off opens.
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  summary?: string | null;

  @ApiProperty({
    enum: HandoffStatusEnum,
  })
  status?: string;

  // The intent outcome that caused the escalation, or `manual`.
  @ApiProperty({
    type: () => String,
  })
  reason?: string;

  @ApiProperty({
    type: () => Conversation,
  })
  conversation?: Conversation;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
