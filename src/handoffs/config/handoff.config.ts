import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { HandoffConfig } from './handoff-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  HANDOFF_SUMMARY_MODEL: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  HANDOFF_SUMMARY_HISTORY_LIMIT: number;
}

export default registerAs<HandoffConfig>('handoff', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    summaryModel: process.env.HANDOFF_SUMMARY_MODEL || 'claude-haiku-4-5',
    summaryHistoryLimit: process.env.HANDOFF_SUMMARY_HISTORY_LIMIT
      ? parseInt(process.env.HANDOFF_SUMMARY_HISTORY_LIMIT, 10)
      : 30,
  };
});
