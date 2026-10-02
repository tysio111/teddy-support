import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesToDomainEntities1790506831468 implements MigrationInterface {
  name = 'AddIndexesToDomainEntities1790506831468';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_member" DROP CONSTRAINT "FK_c3009db3b4315829bf43e1ea711"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" ADD CONSTRAINT "UQ_c3009db3b4315829bf43e1ea711" UNIQUE ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cee2df149b44cbdd4652d7db91" ON "company" ("apiKey") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_47216baa0f0c8ebc6ee5a74989" ON "company" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a0248cb93ea8101f16ecc4ea9" ON "resource" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d7a0b6e0f1d0c0ab1bc189645" ON "client" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3bd0d3cd0928f7348dfaecbb06" ON "conversation" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7cf4a4df1f2627f72bf6231635" ON "message" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24e4f35dfccf55a2ff7637beaa" ON "action" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0afa64a155180ae7844127d78c" ON "detected_intent" ("actionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dccb86eba5ee5455d4992df81f" ON "detected_intent" ("messageId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3009db3b4315829bf43e1ea71" ON "company_member" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24e3f0ad735ec89bb235a39554" ON "company_member" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_66296acaa5a8454be9b11cbfb6" ON "action_parameter" ("actionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_feee6f0ca13f1cda0563bee70f" ON "action_execution" ("actionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c13f804a340cf511ec4b02c3e" ON "action_execution" ("detectedIntentId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" ADD CONSTRAINT "FK_c3009db3b4315829bf43e1ea711" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_member" DROP CONSTRAINT "FK_c3009db3b4315829bf43e1ea711"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c13f804a340cf511ec4b02c3e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_feee6f0ca13f1cda0563bee70f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_66296acaa5a8454be9b11cbfb6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24e3f0ad735ec89bb235a39554"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3009db3b4315829bf43e1ea71"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dccb86eba5ee5455d4992df81f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0afa64a155180ae7844127d78c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24e4f35dfccf55a2ff7637beaa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7cf4a4df1f2627f72bf6231635"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3bd0d3cd0928f7348dfaecbb06"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d7a0b6e0f1d0c0ab1bc189645"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a0248cb93ea8101f16ecc4ea9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_47216baa0f0c8ebc6ee5a74989"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cee2df149b44cbdd4652d7db91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" DROP CONSTRAINT "UQ_c3009db3b4315829bf43e1ea711"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" ADD CONSTRAINT "FK_c3009db3b4315829bf43e1ea711" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
