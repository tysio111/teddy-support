import { MigrationInterface, QueryRunner } from 'typeorm';

export class HumanHandoff1791131253628 implements MigrationInterface {
  name = 'HumanHandoff1791131253628';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `status` was free-form; map existing values onto ConversationStatusEnum.
    await queryRunner.query(
      `UPDATE "conversation" SET "status" = 'resolved' WHERE "status" = 'closed'`,
    );
    await queryRunner.query(
      `UPDATE "conversation" SET "status" = 'open' WHERE "status" NOT IN ('open', 'escalated', 'assigned', 'resolved')`,
    );
    await queryRunner.query(
      `CREATE TABLE "handoff" ("closedAt" TIMESTAMP, "assignedAt" TIMESTAMP, "context" character varying, "summaryStatus" character varying NOT NULL, "summary" character varying, "status" character varying NOT NULL, "reason" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "assigneeId" integer, "conversationId" uuid NOT NULL, CONSTRAINT "PK_036052d138cc8c887e20ce4e1dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7304dc8d0f5ebfd1edfc70a6a9" ON "handoff" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2872f62f3a5fce1c58252fd84d" ON "handoff" ("conversationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD "assigneeId" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0d448862b6090e5239102fb2db" ON "conversation" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_6aea24ddd3fe0a1ec140a2f529b" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handoff" ADD CONSTRAINT "FK_c520a449e81b0c4191fd1e9ac65" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handoff" ADD CONSTRAINT "FK_2872f62f3a5fce1c58252fd84d3" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "handoff" DROP CONSTRAINT "FK_2872f62f3a5fce1c58252fd84d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "handoff" DROP CONSTRAINT "FK_c520a449e81b0c4191fd1e9ac65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_6aea24ddd3fe0a1ec140a2f529b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0d448862b6090e5239102fb2db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "assigneeId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2872f62f3a5fce1c58252fd84d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7304dc8d0f5ebfd1edfc70a6a9"`,
    );
    await queryRunner.query(`DROP TABLE "handoff"`);
  }
}
