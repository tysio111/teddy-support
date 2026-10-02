// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateActionParameterDto } from './create-action-parameter.dto';

export class UpdateActionParameterDto extends PartialType(
  CreateActionParameterDto,
) {}
