import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActionParametersService } from '../action-parameters/action-parameters.service';
import { ActionsService } from '../actions/actions.service';
import { FilesService } from '../files/files.service';
import { ResourcesService } from '../resources/resources.service';
import { ActionExtractor, ExtractedAction } from './action-extractor';
import { DocExtractionService } from './doc-extraction.service';
import { ACTION_EXTRACTION_REQUESTED_EVENT } from './events/action-extraction-requested.event';

const extracted: ExtractedAction[] = [
  {
    name: 'cancel_order',
    description: 'Cancels an order',
    httpMethod: 'POST',
    endpointUrl: 'https://api.shop.com/orders/{orderId}/cancel',
    authType: 'bearer',
    requiresConfirmation: true,
    parameters: [
      {
        name: 'orderId',
        type: 'string',
        description: 'Order id',
        isRequired: true,
        enumValues: null,
      },
      {
        name: 'reason',
        type: 'string',
        description: 'Why',
        isRequired: false,
        enumValues: ['damaged', 'late'],
      },
    ],
  },
];

describe('DocExtractionService', () => {
  function setup(resource: Record<string, unknown> | null = {}) {
    const resourcesService = {
      findById: jest.fn().mockResolvedValue(
        resource && {
          id: 'resource-1',
          status: 'uploaded',
          file: { id: 'file-1', path: '/api/v1/files/doc.pdf' },
          ...resource,
        },
      ),
      update: jest
        .fn()
        .mockImplementation((id, payload) =>
          Promise.resolve({ id, ...payload }),
        ),
    };
    const filesService = {
      getContent: jest.fn().mockResolvedValue(Buffer.from('%PDF')),
    };
    const actionsService = {
      findDraftsByResource: jest
        .fn()
        .mockResolvedValue([{ id: 'old-1' }, { id: 'old-2' }]),
      remove: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'action-1' }),
    };
    const actionParametersService = {
      removeByActionIds: jest.fn(),
      create: jest.fn(),
    };
    const actionExtractor = {
      extract: jest.fn().mockResolvedValue(extracted),
    };
    const eventEmitter = { emit: jest.fn() };

    const service = new DocExtractionService(
      resourcesService as unknown as ResourcesService,
      filesService as unknown as FilesService,
      actionsService as unknown as ActionsService,
      actionParametersService as unknown as ActionParametersService,
      actionExtractor as unknown as ActionExtractor,
      eventEmitter as unknown as EventEmitter2,
    );

    return {
      service,
      resourcesService,
      actionsService,
      actionParametersService,
      actionExtractor,
      eventEmitter,
    };
  }

  describe('requestExtraction', () => {
    it('should mark the resource processing and queue the extraction', async () => {
      const { service, resourcesService, eventEmitter } = setup();

      await service.requestExtraction('resource-1');

      expect(resourcesService.update).toHaveBeenCalledWith('resource-1', {
        status: 'processing',
        extractionError: null,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ACTION_EXTRACTION_REQUESTED_EVENT,
        { resourceId: 'resource-1' },
      );
    });

    it.each([
      ['a missing resource', null, NotFoundException],
      ['a resource without file', { file: null }, UnprocessableEntityException],
      [
        'an unsupported file',
        { file: { id: 'file-1', path: 'x.png' } },
        UnprocessableEntityException,
      ],
      ['a running extraction', { status: 'processing' }, ConflictException],
    ])('should reject %s', async (_, resource, error) => {
      const { service, eventEmitter } = setup(resource);

      await expect(service.requestExtraction('resource-1')).rejects.toThrow(
        error,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('extract', () => {
    it('should replace old drafts with the extracted actions', async () => {
      const {
        service,
        resourcesService,
        actionsService,
        actionParametersService,
      } = setup();

      await service.extract('resource-1');

      expect(actionParametersService.removeByActionIds).toHaveBeenCalledWith([
        'old-1',
        'old-2',
      ]);
      expect(actionsService.remove).toHaveBeenCalledTimes(2);
      expect(actionsService.create).toHaveBeenCalledWith({
        name: 'cancel_order',
        description: 'Cancels an order',
        httpMethod: 'POST',
        endpointUrl: 'https://api.shop.com/orders/{orderId}/cancel',
        authType: 'bearer',
        requiresConfirmation: true,
        status: 'draft',
        resource: { id: 'resource-1' },
      });
      expect(actionParametersService.create.mock.calls).toEqual([
        [
          {
            name: 'orderId',
            type: 'string',
            description: 'Order id',
            isRequired: true,
            enumValues: null,
            order: 0,
            action: { id: 'action-1' },
          },
        ],
        [
          {
            name: 'reason',
            type: 'string',
            description: 'Why',
            isRequired: false,
            enumValues: '["damaged","late"]',
            order: 1,
            action: { id: 'action-1' },
          },
        ],
      ]);
      expect(resourcesService.update).toHaveBeenLastCalledWith('resource-1', {
        status: 'extracted',
      });
    });

    it('should mark the resource failed without touching drafts', async () => {
      const { service, resourcesService, actionsService, actionExtractor } =
        setup();
      actionExtractor.extract.mockRejectedValue(new Error('overloaded'));

      await expect(service.extract('resource-1')).resolves.toBeUndefined();

      expect(actionsService.findDraftsByResource).not.toHaveBeenCalled();
      expect(resourcesService.update).toHaveBeenLastCalledWith('resource-1', {
        status: 'failed',
        extractionError: 'overloaded',
      });
    });
  });
});
