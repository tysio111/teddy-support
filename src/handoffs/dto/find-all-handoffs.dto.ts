import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { HandoffStatusEnum } from '../handoff-status.enum';

export class FindAllHandoffsDto {
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

  @ApiPropertyOptional({ enum: HandoffStatusEnum })
  @IsEnum(HandoffStatusEnum)
  @IsOptional()
  status?: HandoffStatusEnum;

  @ApiPropertyOptional({
    description: 'User id of the assigned agent, or "me"',
  })
  @IsString()
  @IsOptional()
  assignee?: string;
}
