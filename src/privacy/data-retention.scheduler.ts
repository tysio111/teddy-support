import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { ClientDataService } from './client-data.service';

// Deletes conversations older than DATA_RETENTION_DAYS on boot and then every
// DATA_RETENTION_INTERVAL_MINUTES. In-process like the rest of the app's
// background work; with several instances each one runs it, which is safe
// because deleting is idempotent.
@Injectable()
export class DataRetentionScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(DataRetentionScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly clientDataService: ClientDataService,
  ) {}

  onApplicationBootstrap(): void {
    const { retentionDays, retentionIntervalMinutes } =
      this.configService.getOrThrow('privacy', { infer: true });
    if (!retentionDays) {
      return;
    }

    const run = () => void this.run(retentionDays);
    this.timer = setInterval(run, retentionIntervalMinutes * 60 * 1000);
    this.timer.unref();
    run();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async run(retentionDays: number): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      await this.clientDataService.purgeExpired(retentionDays);
    } catch (error) {
      this.logger.error(
        'Data retention run failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
