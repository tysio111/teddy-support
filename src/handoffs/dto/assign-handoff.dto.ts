import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class AssignHandoffDto {
  @ApiPropertyOptional({
    type: Number,
    description: 'Agent to assign; defaults to the caller',
  })
  @IsOptional()
  userId?: number | string;
}
