import {
  AdvancedConsoleLogger,
  LoggerOptions,
  LogMessage,
  QueryRunner,
} from 'typeorm';
import { PrepareLogMessagesOptions } from 'typeorm/logger/Logger';
import { PiiRedactor } from './pii-redactor';

// TypeORM writes to the console directly, not through the Nest logger, and
// its query log includes the parameters (message content, emails).
export class RedactingTypeOrmLogger extends AdvancedConsoleLogger {
  constructor(
    private readonly redactor: PiiRedactor,
    options?: LoggerOptions,
  ) {
    super(options);
  }

  protected prepareLogMessages(
    logMessage: LogMessage | string | number | (LogMessage | string | number)[],
    options?: Partial<PrepareLogMessagesOptions>,
    queryRunner?: QueryRunner,
  ): LogMessage[] {
    return super
      .prepareLogMessages(logMessage, options, queryRunner)
      .map((message) =>
        typeof message.message === 'string'
          ? { ...message, message: this.redactor.redact(message.message) }
          : message,
      );
  }
}
