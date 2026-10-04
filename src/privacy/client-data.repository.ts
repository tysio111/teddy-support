import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BOT_PAUSED_STATUSES } from '../conversations/conversation-status.enum';
import { ErasureResult } from './privacy.types';

// Deletes a conversation together with everything recorded about it. The
// foreign keys have no ON DELETE CASCADE, so children go first.
const DELETE_CONVERSATIONS_SQL: [keyof ErasureResult, string][] = [
  [
    'actionExecutions',
    `DELETE FROM "action_execution" WHERE "detectedIntentId" IN (
       SELECT "detected_intent"."id" FROM "detected_intent"
       JOIN "message" ON "message"."id" = "detected_intent"."messageId"
       WHERE "message"."conversationId" = ANY($1::uuid[]))`,
  ],
  [
    'detectedIntents',
    `DELETE FROM "detected_intent" WHERE "messageId" IN (
       SELECT "id" FROM "message" WHERE "conversationId" = ANY($1::uuid[]))`,
  ],
  [
    'messages',
    `DELETE FROM "message" WHERE "conversationId" = ANY($1::uuid[])`,
  ],
  [
    'handoffs',
    `DELETE FROM "handoff" WHERE "conversationId" = ANY($1::uuid[])`,
  ],
  ['conversations', `DELETE FROM "conversation" WHERE "id" = ANY($1::uuid[])`],
];

@Injectable()
export class ClientDataRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findConversationIdsByClientId(clientId: string): Promise<string[]> {
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT "id" FROM "conversation" WHERE "clientId" = $1`,
      [clientId],
    );
    return rows.map(({ id }) => id);
  }

  // Conversations with no activity since `cutoff`. Those waiting for or owned
  // by an agent are kept until the agent is done with them.
  async findExpiredConversationIds(
    cutoff: Date,
    limit: number,
  ): Promise<string[]> {
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT "id" FROM "conversation"
       WHERE COALESCE("lastMessageAt", "createdAt") < $1
         AND "status" <> ALL($2::varchar[])
       ORDER BY COALESCE("lastMessageAt", "createdAt")
       LIMIT $3`,
      [cutoff, BOT_PAUSED_STATUSES, limit],
    );
    return rows.map(({ id }) => id);
  }

  deleteConversations(conversationIds: string[]): Promise<ErasureResult> {
    return this.dataSource.transaction((manager) =>
      this.deleteConversationsWith(manager, conversationIds),
    );
  }

  // Removes the client and all their conversations in one transaction. The
  // conversation ids are re-read under lock, so one created meanwhile is
  // included; they are returned for cleanup outside the database.
  eraseClient(
    clientId: string,
  ): Promise<{ result: ErasureResult; conversationIds: string[] } | null> {
    return this.dataSource.transaction(async (manager) => {
      const [client]: { id: string }[] = await manager.query(
        `SELECT "id" FROM "client" WHERE "id" = $1 FOR UPDATE`,
        [clientId],
      );
      if (!client) {
        return null;
      }

      const rows: { id: string }[] = await manager.query(
        `SELECT "id" FROM "conversation" WHERE "clientId" = $1 FOR UPDATE`,
        [clientId],
      );
      const conversationIds = rows.map(({ id }) => id);
      const result = await this.deleteConversationsWith(
        manager,
        conversationIds,
      );
      await manager.query(`DELETE FROM "client" WHERE "id" = $1`, [clientId]);

      return { result, conversationIds };
    });
  }

  // Client profiles left without conversations and untouched since `cutoff`.
  async deleteInactiveClients(cutoff: Date): Promise<number> {
    const [, count]: [unknown, number] = await this.dataSource.query(
      `DELETE FROM "client" WHERE "updatedAt" < $1
         AND NOT EXISTS (
           SELECT 1 FROM "conversation"
           WHERE "conversation"."clientId" = "client"."id")`,
      [cutoff],
    );
    return count;
  }

  private async deleteConversationsWith(
    manager: EntityManager,
    conversationIds: string[],
  ): Promise<ErasureResult> {
    const result = emptyErasureResult();
    if (!conversationIds.length) {
      return result;
    }

    for (const [key, sql] of DELETE_CONVERSATIONS_SQL) {
      const [, count]: [unknown, number] = await manager.query(sql, [
        conversationIds,
      ]);
      result[key] = count;
    }
    return result;
  }
}

export function emptyErasureResult(): ErasureResult {
  return {
    conversations: 0,
    messages: 0,
    detectedIntents: 0,
    actionExecutions: 0,
    handoffs: 0,
  };
}
