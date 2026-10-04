import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationLlmUsage1791133564980 implements MigrationInterface {
  name = 'ConversationLlmUsage1791133564980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "llmCostUsd" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "llmOutputTokens" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "llmInputTokens" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "llmInputTokens"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "llmOutputTokens"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "llmCostUsd"`,
    );
  }
}
