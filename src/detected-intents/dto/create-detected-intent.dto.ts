import { ActionDto } from '../../actions/dto/action.dto';

import { MessageDto } from '../../messages/dto/message.dto';

export class CreateDetectedIntentDto {
  extractedParameters?: string | null;

  status?: string;

  rank?: number;

  confidenceScore?: number;

  action?: ActionDto | null;

  message?: MessageDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
