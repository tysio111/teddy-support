import { ActionDto } from '../../actions/dto/action.dto';

import { DetectedIntentDto } from '../../detected-intents/dto/detected-intent.dto';

export class CreateActionExecutionDto {
  executedAt?: Date | null;

  errorMessage?: string | null;

  responsePayload?: string | null;

  responseStatusCode?: number | null;

  status?: string;

  requestPayload?: string;

  action?: ActionDto;

  detectedIntent?: DetectedIntentDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
