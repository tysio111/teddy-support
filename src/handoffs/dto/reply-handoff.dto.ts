import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyHandoffDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}
