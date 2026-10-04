import { Injectable, Logger } from '@nestjs/common';
import { IntentGraphService } from '../intent-recognition/graph/intent-graph.service';
import {
  ClientDataRepository,
  emptyErasureResult,
} from './client-data.repository';
import { ErasureResult, RetentionResult } from './privacy.types';

const RETENTION_BATCH_SIZE = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

// GDPR erasure and retention. Besides the relational rows, the intent graph
// checkpoints (keyed by conversation id) hold message content and are deleted
// too. They go first: a failure then leaves the conversation in place to be
// retried, rather than orphaned checkpoints nobody can find.
@Injectable()
export class ClientDataService {
  private readonly logger = new Logger(ClientDataService.name);

  constructor(
    private readonly clientDataRepository: ClientDataRepository,
    private readonly intentGraphService: IntentGraphService,
  ) {}

  // Right to erasure: the client, their conversations and everything derived
  // from them. Returns null when the client does not exist.
  async eraseClient(clientId: string): Promise<ErasureResult | null> {
    const known =
      await this.clientDataRepository.findConversationIdsByClientId(clientId);
    await this.deleteThreads(known);

    const erased = await this.clientDataRepository.eraseClient(clientId);
    if (!erased) {
      return null;
    }

    // Conversations started between the two reads.
    await this.deleteThreads(
      erased.conversationIds.filter((id) => !known.includes(id)),
    );

    this.logger.log(
      `Client ${clientId} erased: ${formatResult(erased.result)}`,
    );
    return erased.result;
  }

  async purgeExpired(
    retentionDays: number,
    now = new Date(),
  ): Promise<RetentionResult> {
    const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
    const total = emptyErasureResult();

    for (;;) {
      const ids = await this.clientDataRepository.findExpiredConversationIds(
        cutoff,
        RETENTION_BATCH_SIZE,
      );
      if (!ids.length) {
        break;
      }

      await this.deleteThreads(ids);
      const result = await this.clientDataRepository.deleteConversations(ids);
      for (const key of Object.keys(total) as (keyof ErasureResult)[]) {
        total[key] += result[key];
      }

      if (ids.length < RETENTION_BATCH_SIZE) {
        break;
      }
    }

    const clients =
      await this.clientDataRepository.deleteInactiveClients(cutoff);
    const result = { ...total, clients };

    if (total.conversations || clients) {
      this.logger.log(
        `Retention (${retentionDays} days): ${formatResult(result)}`,
      );
    }
    return result;
  }

  private async deleteThreads(conversationIds: string[]): Promise<void> {
    for (const id of conversationIds) {
      await this.intentGraphService.deleteThread(id);
    }
  }
}

function formatResult(result: ErasureResult | RetentionResult): string {
  return Object.entries(result)
    .map(([key, count]) => `${count} ${key}`)
    .join(', ');
}
