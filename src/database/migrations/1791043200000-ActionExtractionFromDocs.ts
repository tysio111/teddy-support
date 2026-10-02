import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActionExtractionFromDocs1791043200000 implements MigrationInterface {
  name = 'ActionExtractionFromDocs1791043200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resource" ADD "extractionError" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "action" ADD "resourceId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "action" ADD CONSTRAINT "FK_5fab10d6c69895d1c5e00838816" FOREIGN KEY ("resourceId") REFERENCES "resource"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "action" DROP CONSTRAINT "FK_5fab10d6c69895d1c5e00838816"`,
    );
    await queryRunner.query(`ALTER TABLE "action" DROP COLUMN "resourceId"`);
    await queryRunner.query(
      `ALTER TABLE "resource" DROP COLUMN "extractionError"`,
    );
  }
}
