import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleAndSocialIndex1790506892375 implements MigrationInterface {
  name = 'AddUserRoleAndSocialIndex1790506892375';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_c28e52f758e7bbc53828db9219" ON "user" ("roleId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5b7ac2ebe9a3fe8d54c37d6d31" ON "user" ("socialId", "provider") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5b7ac2ebe9a3fe8d54c37d6d31"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c28e52f758e7bbc53828db9219"`,
    );
  }
}
