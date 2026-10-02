import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { IntentGraphService } from './graph/intent-graph.service';

@ApiTags('Intent recognition')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'intent-recognition',
  version: '1',
})
export class IntentRecognitionController {
  constructor(private readonly intentGraphService: IntentGraphService) {}

  // Paste into https://mermaid.live to render the graph.
  @Get('graph')
  @ApiOkResponse({ schema: { properties: { mermaid: { type: 'string' } } } })
  async getGraph(): Promise<{ mermaid: string }> {
    return { mermaid: await this.intentGraphService.drawMermaid() };
  }
}
