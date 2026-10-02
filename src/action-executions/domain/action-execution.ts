import { Action } from '../../actions/domain/action';
import { DetectedIntent } from '../../detected-intents/domain/detected-intent';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ActionExecution {
  @Exclude({ toPlainOnly: true })
  executedAt?: Date | null;

  @Exclude({ toPlainOnly: true })
  errorMessage?: string | null;

  @Exclude({ toPlainOnly: true })
  responsePayload?: string | null;

  @Exclude({ toPlainOnly: true })
  responseStatusCode?: number | null;

  @Exclude({ toPlainOnly: true })
  status?: string;

  @Exclude({ toPlainOnly: true })
  requestPayload?: string;

  @Exclude({ toPlainOnly: true })
  action?: Action;

  @Exclude({ toPlainOnly: true })
  detectedIntent?: DetectedIntent;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
