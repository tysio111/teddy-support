import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Resource } from '../resources/domain/resource';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { DocExtractionService } from './doc-extraction.service';

@ApiTags('Resources')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'resources',
  version: '1',
})
export class DocExtractionController {
  constructor(private readonly docExtractionService: DocExtractionService) {}

  // Reads the resource's PDF/DOCX and replaces its draft actions. Runs in the
  // background: poll the resource until its status is extracted or failed.
  @Post(':id/extract-actions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiAcceptedResponse({
    type: Resource,
  })
  extractActions(@Param('id') id: string) {
    return this.docExtractionService.requestExtraction(id);
  }
}
