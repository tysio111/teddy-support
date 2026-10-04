import { AppConfig } from './app-config.type';
import { AuthConfig } from '../auth/config/auth-config.type';
import { DatabaseConfig } from '../database/config/database-config.type';
import { FileConfig } from '../files/config/file-config.type';
import { MailConfig } from '../mail/config/mail-config.type';
import { IntentRecognitionConfig } from '../intent-recognition/config/intent-recognition-config.type';
import { DocExtractionConfig } from '../doc-extraction/config/doc-extraction-config.type';
import { KnowledgeConfig } from '../knowledge/config/knowledge-config.type';
import { HandoffConfig } from '../handoffs/config/handoff-config.type';
import { PrivacyConfig } from '../privacy/config/privacy-config.type';

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  file: FileConfig;
  mail: MailConfig;
  intentRecognition: IntentRecognitionConfig;
  docExtraction: DocExtractionConfig;
  knowledge: KnowledgeConfig;
  handoff: HandoffConfig;
  privacy: PrivacyConfig;
};
