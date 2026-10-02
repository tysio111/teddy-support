import { BaseCheckpointSaver, MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Pool } from 'pg';
import { DatabaseConfig } from '../../database/config/database-config.type';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';

// Checkpoint tables live in their own schema, outside TypeORM's migrations.
const CHECKPOINT_SCHEMA = 'langgraph';
const CHECKPOINT_POOL_SIZE = 5;

export async function createCheckpointer(
  config: IntentRecognitionConfig,
  database: DatabaseConfig,
): Promise<BaseCheckpointSaver> {
  if (!config.enabled || config.checkpointer === 'memory') {
    return new MemorySaver();
  }

  const pool = new Pool({
    connectionString: database.url,
    host: database.host,
    port: database.port,
    user: database.username,
    password: database.password,
    database: database.name,
    max: CHECKPOINT_POOL_SIZE,
    ssl: database.sslEnabled
      ? {
          rejectUnauthorized: database.rejectUnauthorized,
          ca: database.ca ?? undefined,
          key: database.key ?? undefined,
          cert: database.cert ?? undefined,
        }
      : undefined,
  });
  const saver = new PostgresSaver(pool, undefined, {
    schema: CHECKPOINT_SCHEMA,
  });
  // Idempotent: creates the schema/tables and applies pending migrations.
  await saver.setup();

  return saver;
}
