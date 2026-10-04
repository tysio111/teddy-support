import { registerAs } from '@nestjs/config';
import {
  IsBoolean,
  IsIn,
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

  @IsString()
  @IsOptional()
  INTENT_LLM_FALLBACK_MODEL: string;

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

  @IsBoolean()
  @IsOptional()
  INTENT_GUARDRAIL_ENABLED: boolean;

  @IsBoolean()
  @IsOptional()
  INTENT_OUTPUT_GUARDRAIL_ENABLED: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  INTENT_LLM_NODE_TIMEOUT_MS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  INTENT_MAX_REPAIR_ATTEMPTS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  INTENT_MAX_CLARIFICATION_ROUNDS: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  INTENT_MAX_EXECUTION_ATTEMPTS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  INTENT_EXECUTION_BACKOFF_BASE_MS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  INTENT_EXECUTION_MAX_BACKOFF_MS: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  INTENT_CIRCUIT_WINDOW_MS: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  INTENT_CIRCUIT_FAILURE_RATE: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  INTENT_CIRCUIT_MIN_CALLS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  INTENT_CIRCUIT_COOLDOWN_MS: number;

  @IsIn(['postgres', 'memory'])
  @IsOptional()
  INTENT_CHECKPOINTER: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  INTENT_PENDING_INPUT_TTL_MS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  INTENT_DEBOUNCE_MS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  INTENT_DEBOUNCE_MAX_WAIT_MS: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  INTENT_CONVERSATION_BUDGET_USD: number;
}

function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  return value ? parseInt(value, 10) : fallback;
}

function floatEnv(name: string, fallback: number): number {
  const value = process.env[name];
  return value ? parseFloat(value) : fallback;
}

export default registerAs<IntentRecognitionConfig>('intentRecognition', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    enabled: process.env.INTENT_RECOGNITION_ENABLED === 'true',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.INTENT_LLM_MODEL || 'claude-haiku-4-5-20251001',
    fallbackModel: process.env.INTENT_LLM_FALLBACK_MODEL || undefined,
    historyLimit: intEnv('INTENT_HISTORY_LIMIT', 20),
    maxCandidates: intEnv('INTENT_MAX_CANDIDATES', 3),
    defaultConfidenceThreshold: floatEnv(
      'INTENT_DEFAULT_CONFIDENCE_THRESHOLD',
      0.7,
    ),
    actionExecutionTimeoutMs: intEnv('ACTION_EXECUTION_TIMEOUT_MS', 10000),

    guardrailEnabled: process.env.INTENT_GUARDRAIL_ENABLED !== 'false',
    outputGuardrailEnabled:
      process.env.INTENT_OUTPUT_GUARDRAIL_ENABLED !== 'false',
    llmNodeTimeoutMs: intEnv('INTENT_LLM_NODE_TIMEOUT_MS', 30000),
    maxRepairAttempts: intEnv('INTENT_MAX_REPAIR_ATTEMPTS', 2),
    maxClarificationRounds: intEnv('INTENT_MAX_CLARIFICATION_ROUNDS', 2),
    maxExecutionAttempts: intEnv('INTENT_MAX_EXECUTION_ATTEMPTS', 3),
    executionBackoffBaseMs: intEnv('INTENT_EXECUTION_BACKOFF_BASE_MS', 500),
    executionMaxBackoffMs: intEnv('INTENT_EXECUTION_MAX_BACKOFF_MS', 10000),

    circuitWindowMs: intEnv('INTENT_CIRCUIT_WINDOW_MS', 5 * 60 * 1000),
    circuitFailureRate: floatEnv('INTENT_CIRCUIT_FAILURE_RATE', 0.5),
    circuitMinCalls: intEnv('INTENT_CIRCUIT_MIN_CALLS', 5),
    circuitCooldownMs: intEnv('INTENT_CIRCUIT_COOLDOWN_MS', 30 * 1000),

    checkpointer:
      process.env.INTENT_CHECKPOINTER === 'memory' ? 'memory' : 'postgres',
    pendingInputTtlMs: intEnv(
      'INTENT_PENDING_INPUT_TTL_MS',
      24 * 60 * 60 * 1000,
    ),

    debounceMs: intEnv('INTENT_DEBOUNCE_MS', 1500),
    debounceMaxWaitMs: intEnv('INTENT_DEBOUNCE_MAX_WAIT_MS', 5000),

    conversationBudgetUsd: process.env.INTENT_CONVERSATION_BUDGET_USD
      ? parseFloat(process.env.INTENT_CONVERSATION_BUDGET_USD)
      : null,
  };
});
