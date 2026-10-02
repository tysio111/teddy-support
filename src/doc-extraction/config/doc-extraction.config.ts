import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { DocExtractionConfig } from './doc-extraction-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  DOC_EXTRACTION_MODEL: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  DOC_EXTRACTION_MAX_TOKENS: number;
}

export default registerAs<DocExtractionConfig>('docExtraction', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    // Shared with intent recognition.
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    // Reading long docs and their tables needs a stronger model than chat.
    model: process.env.DOC_EXTRACTION_MODEL || 'claude-sonnet-5-5',
    maxTokens: process.env.DOC_EXTRACTION_MAX_TOKENS
      ? parseInt(process.env.DOC_EXTRACTION_MAX_TOKENS, 10)
      : 16000,
  };
});
