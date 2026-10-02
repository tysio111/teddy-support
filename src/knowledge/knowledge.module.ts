import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ResourcesModule } from '../resources/resources.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeListener } from './knowledge.listener';
import { knowledgeProviders } from './knowledge.provider';
import { KnowledgeService } from './knowledge.service';

// Self-contained: depends on shared domain modules only, never on intent
// recognition (which uses it), so it can move into a library later.
@Module({
  imports: [ResourcesModule, FilesModule],
  controllers: [KnowledgeController],
  providers: [...knowledgeProviders, KnowledgeListener],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
