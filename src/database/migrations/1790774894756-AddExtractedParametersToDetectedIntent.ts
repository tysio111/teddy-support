import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtractedParametersToDetectedIntent1790774894756 implements MigrationInterface {
  name = 'AddExtractedParametersToDetectedIntent1790774894756';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "detected_intent" ADD "extractedParameters" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "detected_intent" DROP COLUMN "extractedParameters"`,
    );
  }
}
