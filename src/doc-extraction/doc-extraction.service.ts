import {
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActionParametersService } from '../action-parameters/action-parameters.service';
import { ActionStatusEnum } from '../actions/action-status.enum';
import { ActionsService } from '../actions/actions.service';
import { FilesService } from '../files/files.service';
import { Resource } from '../resources/domain/resource';
import { ResourceStatusEnum } from '../resources/resource-status.enum';
import { ResourcesService } from '../resources/resources.service';
import { ActionExtractor, ExtractedAction } from './action-extractor';
import { buildDocumentContent, isSupportedDocument } from './document-input';
import {
  ACTION_EXTRACTION_REQUESTED_EVENT,
  ActionExtractionRequestedEvent,
} from './events/action-extraction-requested.event';

@Injectable()
export class DocExtractionService {
  private readonly logger = new Logger(DocExtractionService.name);

  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly filesService: FilesService,
    private readonly actionsService: ActionsService,
    private readonly actionParametersService: ActionParametersService,
    private readonly actionExtractor: ActionExtractor,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Validates the resource and queues the extraction, which runs in the
  // background (see DocExtractionListener).
  async requestExtraction(id: Resource['id']): Promise<Resource> {
    const resource = await this.resourcesService.findById(id);
    if (!resource) {
      throw new NotFoundException();
    }
    if (!resource.file || !isSupportedDocument(resource.file.path)) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'unsupportedDocument',
        },
      });
    }
    if (resource.status === ResourceStatusEnum.processing) {
      throw new ConflictException('Extraction is already running');
    }

    const updated = await this.resourcesService.update(id, {
      status: ResourceStatusEnum.processing,
      extractionError: null,
    });
    this.eventEmitter.emit(
      ACTION_EXTRACTION_REQUESTED_EVENT,
      new ActionExtractionRequestedEvent(id),
    );

    return updated ?? resource;
  }

  // Replaces the resource's draft actions with the ones found in its document.
  // Never throws: failures are recorded on the resource.
  async extract(id: Resource['id']): Promise<void> {
    try {
      const resource = await this.resourcesService.findById(id);
      if (!resource?.file) {
        throw new Error('Resource has no file');
      }

      const document = await buildDocumentContent(
        resource.file.path,
        await this.filesService.getContent(resource.file),
      );
      const actions = await this.actionExtractor.extract(document);

      await this.replaceDrafts(id, actions);
      await this.resourcesService.update(id, {
        status: ResourceStatusEnum.extracted,
      });
      this.logger.log(`Resource ${id}: extracted ${actions.length} actions`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Action extraction failed for resource ${id}`,
        error instanceof Error ? error.stack : message,
      );
      await this.resourcesService
        .update(id, {
          status: ResourceStatusEnum.failed,
          extractionError: message,
        })
        .catch(() => undefined);
    }
  }

  // Not transactional: if it fails midway the resource is marked failed, and
  // the next run starts by removing whatever drafts were left behind.
  private async replaceDrafts(
    resourceId: Resource['id'],
    actions: ExtractedAction[],
  ): Promise<void> {
    const drafts = await this.actionsService.findDraftsByResource(resourceId);
    await this.actionParametersService.removeByActionIds(
      drafts.map(({ id }) => id),
    );
    for (const draft of drafts) {
      await this.actionsService.remove(draft.id);
    }

    for (const { parameters, ...extracted } of actions) {
      const action = await this.actionsService.create({
        ...extracted,
        status: ActionStatusEnum.draft,
        resource: { id: resourceId },
      });

      for (const [order, parameter] of parameters.entries()) {
        await this.actionParametersService.create({
          ...parameter,
          order,
          enumValues: parameter.enumValues?.length
            ? JSON.stringify(parameter.enumValues)
            : null,
          action: { id: action.id },
        });
      }
    }
  }
}
