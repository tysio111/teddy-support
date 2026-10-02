// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateDetectedIntentDto } from './create-detected-intent.dto';

export class UpdateDetectedIntentDto extends PartialType(
  CreateDetectedIntentDto,
) {}
