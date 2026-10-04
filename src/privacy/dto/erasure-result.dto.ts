import { ApiProperty } from '@nestjs/swagger';
import { ErasureResult } from '../privacy.types';

export class ErasureResultDto implements ErasureResult {
  @ApiProperty()
  conversations: number;

  @ApiProperty()
  messages: number;

  @ApiProperty()
  detectedIntents: number;

  @ApiProperty()
  actionExecutions: number;

  @ApiProperty()
  handoffs: number;
}
