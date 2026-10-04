import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { PiiRedactor } from './pii-redactor';

// The application logger: every `Logger` call goes through it, so PII in
// messages, error messages and stack traces (validation errors, upstream
// response bodies) is masked before it is written.
export class RedactingLogger extends ConsoleLogger {
  constructor(private readonly redactor: PiiRedactor) {
    super();
  }

  protected printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
  ): void {
    super.printMessages(
      messages.map((message) => this.redactValue(message)),
      context,
      logLevel,
      writeStreamType,
      this.redactValue(errorStack),
    );
  }

  protected printStackTrace(stack: string): void {
    super.printStackTrace(this.redactor.redact(stack));
  }

  private redactValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.redactor.redact(value);
    }
    if (value instanceof Error) {
      const copy = new Error(this.redactor.redact(value.message));
      copy.name = value.name;
      copy.stack = value.stack && this.redactor.redact(value.stack);
      return copy;
    }
    if (value && typeof value === 'object') {
      // Structured payloads: redact their JSON form rather than walk them.
      try {
        return JSON.parse(
          this.redactor.redact(JSON.stringify(value)),
        ) as unknown;
      } catch {
        return value;
      }
    }
    return value;
  }
}
