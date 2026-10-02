import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfidenceAsFloat1790956800000 implements MigrationInterface {
  name = 'ConfidenceAsFloat1790956800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "action" ALTER COLUMN "confidenceThreshold" TYPE double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "detected_intent" ALTER COLUMN "confidenceScore" TYPE double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "detected_intent" ALTER COLUMN "confidenceScore" TYPE integer USING round("confidenceScore")`,
    );
    await queryRunner.query(
      `ALTER TABLE "action" ALTER COLUMN "confidenceThreshold" TYPE integer USING round("confidenceThreshold")`,
    );
  }
}
