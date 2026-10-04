import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { ClientDataService } from './client-data.service';
import { ErasureResultDto } from './dto/erasure-result.dto';

@ApiTags('Privacy')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'clients',
  version: '1',
})
export class PrivacyController {
  constructor(private readonly clientDataService: ClientDataService) {}

  // GDPR right to erasure: deletes the client with all their conversations,
  // messages, detected intents, action executions, hand-offs and graph state.
  @Delete(':id/personal-data')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: ErasureResultDto,
  })
  @ApiNotFoundResponse()
  async erase(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.clientDataService.eraseClient(id);
    if (!result) {
      throw new NotFoundException();
    }
    return result;
  }
}
