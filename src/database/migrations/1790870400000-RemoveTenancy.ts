import { MigrationInterface, QueryRunner } from 'typeorm';

// Single-tenant deployments: each customer gets its own app instance and
// database, so the company scoping is dropped. `down` restores the schema but
// not the data, so the restored `companyId` columns are nullable.
export class RemoveTenancy1790870400000 implements MigrationInterface {
  name = 'RemoveTenancy1790870400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "resource" DROP CONSTRAINT "FK_3a0248cb93ea8101f16ecc4ea9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client" DROP CONSTRAINT "FK_3d7a0b6e0f1d0c0ab1bc189645f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_3bd0d3cd0928f7348dfaecbb068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "action" DROP CONSTRAINT "FK_24e4f35dfccf55a2ff7637beaa9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a0248cb93ea8101f16ecc4ea9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d7a0b6e0f1d0c0ab1bc189645"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3bd0d3cd0928f7348dfaecbb06"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24e4f35dfccf55a2ff7637beaa"`,
    );
    await queryRunner.query(`ALTER TABLE "resource" DROP COLUMN "companyId"`);
    await queryRunner.query(`ALTER TABLE "client" DROP COLUMN "companyId"`);
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN "companyId"`,
    );
    await queryRunner.query(`ALTER TABLE "action" DROP COLUMN "companyId"`);

    // Dropping the tables also drops their own constraints and indexes.
    await queryRunner.query(`DROP TABLE "company_member"`);
    await queryRunner.query(`DROP TABLE "company"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company" ("apiKey" character varying, "confidenceThreshold" integer, "status" character varying NOT NULL, "slug" character varying NOT NULL, "name" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cee2df149b44cbdd4652d7db91" ON "company" ("apiKey") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_47216baa0f0c8ebc6ee5a74989" ON "company" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "company_member" ("status" character varying NOT NULL, "role" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "companyId" uuid NOT NULL, CONSTRAINT "UQ_c3009db3b4315829bf43e1ea711" UNIQUE ("userId"), CONSTRAINT "PK_50735265431b38042b357626756" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3009db3b4315829bf43e1ea71" ON "company_member" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24e3f0ad735ec89bb235a39554" ON "company_member" ("companyId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" ADD CONSTRAINT "FK_c3009db3b4315829bf43e1ea711" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" ADD CONSTRAINT "FK_24e3f0ad735ec89bb235a395547" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`ALTER TABLE "action" ADD "companyId" uuid`);
    await queryRunner.query(`ALTER TABLE "conversation" ADD "companyId" uuid`);
    await queryRunner.query(`ALTER TABLE "client" ADD "companyId" uuid`);
    await queryRunner.query(`ALTER TABLE "resource" ADD "companyId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_24e4f35dfccf55a2ff7637beaa" ON "action" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3bd0d3cd0928f7348dfaecbb06" ON "conversation" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d7a0b6e0f1d0c0ab1bc189645" ON "client" ("companyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a0248cb93ea8101f16ecc4ea9" ON "resource" ("companyId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "action" ADD CONSTRAINT "FK_24e4f35dfccf55a2ff7637beaa9" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_3bd0d3cd0928f7348dfaecbb068" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client" ADD CONSTRAINT "FK_3d7a0b6e0f1d0c0ab1bc189645f" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" ADD CONSTRAINT "FK_3a0248cb93ea8101f16ecc4ea9c" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
