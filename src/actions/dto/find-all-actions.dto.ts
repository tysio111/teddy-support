import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ActionStatusEnum } from '../action-status.enum';
import { Transform } from 'class-transformer';

export class FindAllActionsDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ActionStatusEnum })
  @IsEnum(ActionStatusEnum)
  @IsOptional()
  status?: ActionStatusEnum;

  @ApiPropertyOptional({ description: 'Source resource of the action' })
  @IsUUID()
  @IsOptional()
  resourceId?: string;
}
