import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { DetectedIntentsService } from './detected-intents.service';
import { CreateDetectedIntentDto } from './dto/create-detected-intent.dto';
import { UpdateDetectedIntentDto } from './dto/update-detected-intent.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DetectedIntent } from './domain/detected-intent';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllDetectedIntentsDto } from './dto/find-all-detected-intents.dto';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';

@ApiTags('Detectedintents')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'detected-intents',
  version: '1',
})
export class DetectedIntentsController {
  constructor(
    private readonly detectedIntentsService: DetectedIntentsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: DetectedIntent,
  })
  create(@Body() createDetectedIntentDto: CreateDetectedIntentDto) {
    return this.detectedIntentsService.create(createDetectedIntentDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(DetectedIntent),
  })
  async findAll(
    @Query() query: FindAllDetectedIntentsDto,
  ): Promise<InfinityPaginationResponseDto<DetectedIntent>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.detectedIntentsService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: DetectedIntent,
  })
  findById(@Param('id') id: string) {
    return this.detectedIntentsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: DetectedIntent,
  })
  update(
    @Param('id') id: string,
    @Body() updateDetectedIntentDto: UpdateDetectedIntentDto,
  ) {
    return this.detectedIntentsService.update(id, updateDetectedIntentDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.detectedIntentsService.remove(id);
  }
}
