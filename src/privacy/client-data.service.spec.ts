import { IntentGraphService } from '../intent-recognition/graph/intent-graph.service';
import {
  ClientDataRepository,
  emptyErasureResult,
} from './client-data.repository';
import { ClientDataService } from './client-data.service';

function createService() {
  const calls: string[] = [];
  const repository = {
    findConversationIdsByClientId: jest.fn().mockResolvedValue(['c1']),
    eraseClient: jest.fn(() => {
      calls.push('eraseClient');
      return Promise.resolve({
        result: { ...emptyErasureResult(), conversations: 2 },
        conversationIds: ['c1', 'c2'],
      });
    }),
    findExpiredConversationIds: jest.fn(),
    deleteConversations: jest.fn((ids: string[]) =>
      Promise.resolve({
        ...emptyErasureResult(),
        conversations: ids.length,
      }),
    ),
    deleteInactiveClients: jest.fn().mockResolvedValue(1),
  };
  const intentGraphService = {
    deleteThread: jest.fn((id: string) => {
      calls.push(`deleteThread ${id}`);
      return Promise.resolve();
    }),
  };

  const service = new ClientDataService(
    repository as unknown as ClientDataRepository,
    intentGraphService as unknown as IntentGraphService,
  );
  return { service, repository, calls };
}

describe('ClientDataService', () => {
  it('should delete checkpoints before rows, including conversations created meanwhile', async () => {
    const { service, calls } = createService();

    const result = await service.eraseClient('client-1');

    expect(result?.conversations).toBe(2);
    expect(calls).toEqual([
      'deleteThread c1',
      'eraseClient',
      'deleteThread c2',
    ]);
  });

  it('should return null for an unknown client', async () => {
    const { service, repository } = createService();
    repository.findConversationIdsByClientId.mockResolvedValue([]);
    repository.eraseClient.mockResolvedValue(null as never);

    expect(await service.eraseClient('missing')).toBeNull();
  });

  it('should purge expired conversations in batches', async () => {
    const { service, repository } = createService();
    const fullBatch = Array.from({ length: 200 }, (_, i) => `c${i}`);
    repository.findExpiredConversationIds
      .mockResolvedValueOnce(fullBatch)
      .mockResolvedValueOnce(['last']);

    const result = await service.purgeExpired(
      30,
      new Date('2026-10-04T00:00:00Z'),
    );

    expect(result).toMatchObject({ conversations: 201, clients: 1 });
    expect(repository.findExpiredConversationIds).toHaveBeenCalledWith(
      new Date('2026-09-04T00:00:00Z'),
      200,
    );
    expect(repository.deleteInactiveClients).toHaveBeenCalledWith(
      new Date('2026-09-04T00:00:00Z'),
    );
  });
});
