import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { RateLimitConfig } from './rate-limit-config.type';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @IsOptional()
  RATE_LIMIT_TTL_MS: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  RATE_LIMIT_IP_LIMIT: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  RATE_LIMIT_CONVERSATION_LIMIT: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  RATE_LIMIT_CLIENT_LIMIT: number;
}

function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  return value ? parseInt(value, 10) : fallback;
}

export default registerAs<RateLimitConfig>('rateLimit', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    ttlMs: intEnv('RATE_LIMIT_TTL_MS', 60 * 1000),
    ipLimit: intEnv('RATE_LIMIT_IP_LIMIT', 300),
    conversationLimit: intEnv('RATE_LIMIT_CONVERSATION_LIMIT', 20),
    clientLimit: intEnv('RATE_LIMIT_CLIENT_LIMIT', 60),
  };
});
