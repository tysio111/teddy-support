import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseCheckpointSaver, MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Pool } from 'pg';
import { AllConfigType } from '../../config/config.type';

export const INTENT_CHECKPOINTER = Symbol('INTENT_CHECKPOINTER');

// Checkpoint tables live in their own schema, outside TypeORM's migrations.
const CHECKPOINT_SCHEMA = 'langgraph';
const CHECKPOINT_POOL_SIZE = 5;

export const checkpointerProvider: Provider<BaseCheckpointSaver> = {
  provide: INTENT_CHECKPOINTER,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService<AllConfigType>) => {
    const config = configService.getOrThrow('intentRecognition', {
      infer: true,
    });

    if (!config.enabled || config.checkpointer === 'memory') {
      return new MemorySaver();
    }

    const database = configService.getOrThrow('database', { infer: true });
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
  },
};
