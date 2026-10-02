import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
