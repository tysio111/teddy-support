import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResourceKnowledgeIndex1791129600000 implements MigrationInterface {
  name = 'ResourceKnowledgeIndex1791129600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resource" ADD "indexError" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" ADD "indexStatus" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "resource" DROP COLUMN "indexStatus"`);
    await queryRunner.query(`ALTER TABLE "resource" DROP COLUMN "indexError"`);
  }
}
