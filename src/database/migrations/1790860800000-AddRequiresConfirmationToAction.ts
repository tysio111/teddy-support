import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequiresConfirmationToAction1790860800000 implements MigrationInterface {
  name = 'AddRequiresConfirmationToAction1790860800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "action" ADD "requiresConfirmation" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "action" DROP COLUMN "requiresConfirmation"`,
    );
  }
}
