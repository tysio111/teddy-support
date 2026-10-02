import { Action } from '../../actions/domain/action';
import { Message } from '../../messages/domain/message';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetectedIntent {
  @Exclude({ toPlainOnly: true })
  extractedParameters?: string | null;

  @Exclude({ toPlainOnly: true })
  status?: string;

  @Exclude({ toPlainOnly: true })
  rank?: number;

  @Exclude({ toPlainOnly: true })
  confidenceScore?: number;

  @Exclude({ toPlainOnly: true })
  action?: Action | null;

  @Exclude({ toPlainOnly: true })
  message?: Message;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
