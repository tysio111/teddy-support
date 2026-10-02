import { registerAs } from '@nestjs/config';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { IntentRecognitionConfig } from './intent-recognition-config.type';

class EnvironmentVariablesValidator {
  @IsBoolean()
  @IsOptional()
  INTENT_RECOGNITION_ENABLED: boolean;

  // Read the raw env value: implicit conversion turns any non-empty string
  // (including 'false') into `true`.
  @ValidateIf(() => process.env.INTENT_RECOGNITION_ENABLED === 'true')
  @IsString()
  ANTHROPIC_API_KEY: string;

  @IsString()
  @IsOptional()
  INTENT_LLM_MODEL: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  INTENT_HISTORY_LIMIT: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  INTENT_MAX_CANDIDATES: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  INTENT_DEFAULT_CONFIDENCE_THRESHOLD: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  ACTION_EXECUTION_TIMEOUT_MS: number;
}

export default registerAs<IntentRecognitionConfig>('intentRecognition', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    enabled: process.env.INTENT_RECOGNITION_ENABLED === 'true',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.INTENT_LLM_MODEL || 'claude-haiku-4-5-20251001',
    historyLimit: process.env.INTENT_HISTORY_LIMIT
      ? parseInt(process.env.INTENT_HISTORY_LIMIT, 10)
      : 20,
    maxCandidates: process.env.INTENT_MAX_CANDIDATES
      ? parseInt(process.env.INTENT_MAX_CANDIDATES, 10)
      : 3,
    defaultConfidenceThreshold: process.env.INTENT_DEFAULT_CONFIDENCE_THRESHOLD
      ? parseFloat(process.env.INTENT_DEFAULT_CONFIDENCE_THRESHOLD)
      : 0.7,
    actionExecutionTimeoutMs: process.env.ACTION_EXECUTION_TIMEOUT_MS
      ? parseInt(process.env.ACTION_EXECUTION_TIMEOUT_MS, 10)
      : 10000,
  };
});
