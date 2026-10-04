import { registerAs } from '@nestjs/config';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { PrivacyConfig } from './privacy-config.type';

class EnvironmentVariablesValidator {
  @IsBoolean()
  @IsOptional()
  PII_REDACTION_ENABLED: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  DATA_RETENTION_DAYS: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  DATA_RETENTION_INTERVAL_MINUTES: number;
}

export default registerAs<PrivacyConfig>('privacy', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    piiRedactionEnabled: process.env.PII_REDACTION_ENABLED !== 'false',
    retentionDays: process.env.DATA_RETENTION_DAYS
      ? parseInt(process.env.DATA_RETENTION_DAYS, 10)
      : null,
    retentionIntervalMinutes: process.env.DATA_RETENTION_INTERVAL_MINUTES
      ? parseInt(process.env.DATA_RETENTION_INTERVAL_MINUTES, 10)
      : 60,
  };
});
