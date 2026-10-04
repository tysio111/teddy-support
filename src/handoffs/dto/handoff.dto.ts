import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class HandoffDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
