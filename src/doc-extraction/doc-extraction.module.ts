import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActionParametersModule } from '../action-parameters/action-parameters.module';
import { ActionsModule } from '../actions/actions.module';
import { AllConfigType } from '../config/config.type';
import { FilesModule } from '../files/files.module';
import { ResourcesModule } from '../resources/resources.module';
import { ActionExtractor, createActionExtractor } from './action-extractor';
import { DocExtractionController } from './doc-extraction.controller';
import { DocExtractionListener } from './doc-extraction.listener';
import { DocExtractionService } from './doc-extraction.service';

@Module({
  imports: [
    ResourcesModule,
    FilesModule,
    ActionsModule,
    ActionParametersModule,
  ],
  controllers: [DocExtractionController],
  providers: [
    DocExtractionService,
    DocExtractionListener,
    {
      provide: ActionExtractor,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) =>
        createActionExtractor(
          configService.getOrThrow('docExtraction', { infer: true }),
        ),
    },
  ],
})
export class DocExtractionModule {}
