import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/domain/conversation';
import { MessagesService } from '../messages/messages.service';
import { RoleEnum } from '../roles/roles.enum';
import { UsersService } from '../users/users.service';
import { Handoff } from './domain/handoff';
import { HANDOFF_OPENED_EVENT } from './events/handoff-opened.event';
import { HandoffsService } from './handoffs.service';
import { ACTIVE_HANDOFF_STATUSES } from './handoff-status.enum';
import { HandoffRepository } from './infrastructure/persistence/handoff.repository';
import { HandoffLlmService } from './llm/handoff-llm.service';

const conversation = { id: 'conversation-1', status: 'open' } as Conversation;
const agent = { id: 2, role: { id: RoleEnum.user } };
const otherAgent = { id: 3, role: { id: RoleEnum.user } };
const admin = { id: 1, role: { id: RoleEnum.admin } };

function createService() {
  const handoffs = new Map<string, Handoff>();
  let nextId = 1;

  const repository = {
    create: jest.fn((data: Omit<Handoff, 'id'>) => {
      const handoff = { ...data, id: `handoff-${nextId++}` } as Handoff;
      handoffs.set(handoff.id, handoff);
      return Promise.resolve(handoff);
    }),
    update: jest.fn((id: string, payload: Partial<Handoff>) => {
      const handoff = { ...handoffs.get(id)!, ...payload };
      handoffs.set(id, handoff);
      return Promise.resolve(handoff);
    }),
    findById: jest.fn((id: string) =>
      Promise.resolve(handoffs.get(id) ?? null),
    ),
    findActiveByConversationId: jest.fn((conversationId: string) =>
      Promise.resolve(
        [...handoffs.values()].find(
          (handoff) =>
            handoff.conversation?.id === conversationId &&
            ACTIVE_HANDOFF_STATUSES.includes(handoff.status!),
        ) ?? null,
      ),
    ),
  };
  const conversationsService = {
    findById: jest.fn().mockResolvedValue(conversation),
    setStatus: jest.fn().mockResolvedValue(conversation),
  };
  const usersService = {
    findById: jest.fn((id: number) => Promise.resolve({ id })),
  };
  const messagesService = {
    createAgentMessage: jest.fn((_conversation, content: string) =>
      Promise.resolve({ id: 'message-1', content, sender: 'agent' }),
    ),
    findRecentByConversationId: jest.fn().mockResolvedValue([]),
  };
  const eventEmitter = { emit: jest.fn() };
  const handoffLlmService = { summarize: jest.fn() };
  const configService = { getOrThrow: jest.fn().mockReturnValue(30) };

  const service = new HandoffsService(
    usersService as unknown as UsersService,
    conversationsService as unknown as ConversationsService,
    repository as unknown as HandoffRepository,
    messagesService as unknown as MessagesService,
    eventEmitter as unknown as EventEmitter2,
    handoffLlmService as unknown as HandoffLlmService,
    configService as unknown as ConfigService,
  );

  const open = () =>
    service.open(conversation, { reason: 'no_answer', context: null });

  return {
    service,
    open,
    repository,
    conversationsService,
    messagesService,
    eventEmitter,
    handoffLlmService,
  };
}

describe('HandoffsService', () => {
  describe('open', () => {
    it('should create a pending hand-off and pause the bot', async () => {
      const { open, conversationsService, eventEmitter } = createService();

      const handoff = await open();

      expect(handoff).toEqual(
        expect.objectContaining({
          status: 'pending',
          summaryStatus: 'pending',
          reason: 'no_answer',
        }),
      );
      expect(conversationsService.setStatus).toHaveBeenCalledWith(
        conversation.id,
        'escalated',
        null,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        HANDOFF_OPENED_EVENT,
        expect.objectContaining({ handoffId: handoff.id }),
      );
    });

    it('should reuse the active hand-off of the conversation', async () => {
      const { open, repository, eventEmitter } = createService();

      const first = await open();
      const second = await open();

      expect(second.id).toBe(first.id);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should open a new hand-off once the previous one is closed', async () => {
      const { service, open } = createService();

      const first = await open();
      await service.resolve(first.id, agent);
      const second = await open();

      expect(second.id).not.toBe(first.id);
    });
  });

  describe('assign', () => {
    it('should assign the caller by default', async () => {
      const { service, open, conversationsService } = createService();
      const { id } = await open();

      const handoff = await service.assign(id, agent);

      expect(handoff.status).toBe('assigned');
      expect(handoff.assignee).toEqual({ id: agent.id });
      expect(conversationsService.setStatus).toHaveBeenLastCalledWith(
        conversation.id,
        'assigned',
        { id: agent.id },
      );
    });

    it('should only let admins assign someone else', async () => {
      const { service, open } = createService();
      const { id } = await open();

      await expect(service.assign(id, agent, otherAgent.id)).rejects.toThrow();
      await expect(service.assign(id, admin, otherAgent.id)).resolves.toEqual(
        expect.objectContaining({ assignee: { id: otherAgent.id } }),
      );
    });

    it('should not let an agent take over a colleague', async () => {
      const { service, open } = createService();
      const { id } = await open();
      await service.assign(id, agent);

      await expect(service.assign(id, otherAgent)).rejects.toThrow();
    });
  });

  describe('reply', () => {
    it('should assign a pending hand-off to the first agent who replies', async () => {
      const { service, open, messagesService, repository } = createService();
      const { id } = await open();

      const message = await service.reply(id, agent, 'Hi, I am on it');

      expect(message.sender).toBe('agent');
      expect(messagesService.createAgentMessage).toHaveBeenCalledWith(
        conversation,
        'Hi, I am on it',
      );
      expect((await repository.findById(id))!.assignee).toEqual({
        id: agent.id,
      });
    });

    it('should reject replies from an agent who does not own it', async () => {
      const { service, open, messagesService } = createService();
      const { id } = await open();
      await service.assign(id, agent);

      await expect(service.reply(id, otherAgent, 'Hello')).rejects.toThrow();
      expect(messagesService.createAgentMessage).not.toHaveBeenCalled();
    });
  });

  describe('release and resolve', () => {
    it('should hand the conversation back to the bot', async () => {
      const { service, open, conversationsService } = createService();
      const { id } = await open();
      await service.assign(id, agent);

      const handoff = await service.release(id, agent);

      expect(handoff.status).toBe('released');
      expect(handoff.closedAt).toBeInstanceOf(Date);
      expect(conversationsService.setStatus).toHaveBeenLastCalledWith(
        conversation.id,
        'open',
        null,
      );
    });

    it('should resolve the conversation', async () => {
      const { service, open, conversationsService } = createService();
      const { id } = await open();

      await service.resolve(id, agent);

      expect(conversationsService.setStatus).toHaveBeenLastCalledWith(
        conversation.id,
        'resolved',
        null,
      );
    });

    it('should reject changes to a closed hand-off', async () => {
      const { service, open } = createService();
      const { id } = await open();
      await service.resolve(id, agent);

      await expect(service.release(id, agent)).rejects.toThrow();
      await expect(service.reply(id, agent, 'Hello')).rejects.toThrow();
    });
  });

  describe('summarize', () => {
    it('should store the summary', async () => {
      const { service, open, handoffLlmService, repository } = createService();
      const { id } = await open();
      handoffLlmService.summarize.mockResolvedValue({ summary: 'Late order' });

      await service.summarize(id);

      const handoff = await repository.findById(id);
      expect(handoff!.summaryStatus).toBe('ready');
      expect(JSON.parse(handoff!.summary!)).toEqual({ summary: 'Late order' });
    });

    it('should mark the summary as failed without throwing', async () => {
      const { service, open, handoffLlmService, repository } = createService();
      const { id } = await open();
      handoffLlmService.summarize.mockRejectedValue(new Error('overloaded'));

      await expect(service.summarize(id)).resolves.toBeUndefined();

      expect((await repository.findById(id))!.summaryStatus).toBe('failed');
    });
  });
});
