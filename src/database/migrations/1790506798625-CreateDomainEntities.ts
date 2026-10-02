import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDomainEntities1790506798625 implements MigrationInterface {
  name = 'CreateDomainEntities1790506798625';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company" ("apiKey" character varying, "confidenceThreshold" integer, "status" character varying NOT NULL, "slug" character varying NOT NULL, "name" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "resource" ("vectorRef" character varying, "status" character varying NOT NULL, "sourceUrl" character varying, "type" character varying NOT NULL, "title" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fileId" uuid, "companyId" uuid NOT NULL, CONSTRAINT "REL_b8b68bd7738f0c5c55dc7981c2" UNIQUE ("fileId"), CONSTRAINT "PK_e2894a5867e06ae2e8889f1173f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "client" ("email" character varying, "name" character varying, "externalReference" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" uuid NOT NULL, CONSTRAINT "PK_96da49381769303a6515a8785c7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation" ("lastMessageAt" TIMESTAMP, "status" character varying NOT NULL, "channel" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "clientId" uuid, "companyId" uuid NOT NULL, CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "message" ("content" character varying NOT NULL, "sender" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "conversationId" uuid NOT NULL, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "action" ("status" character varying NOT NULL, "confidenceThreshold" integer, "authCredential" character varying, "authType" character varying NOT NULL, "httpMethod" character varying NOT NULL, "endpointUrl" character varying NOT NULL, "description" character varying NOT NULL, "name" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" uuid NOT NULL, CONSTRAINT "PK_2d9db9cf5edfbbae74eb56e3a39" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "detected_intent" ("status" character varying NOT NULL, "rank" integer NOT NULL, "confidenceScore" integer NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "actionId" uuid, "messageId" uuid NOT NULL, CONSTRAINT "PK_a08f280b1b1b0d49a6ff5a72267" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_member" ("status" character varying NOT NULL, "role" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "companyId" uuid NOT NULL, CONSTRAINT "PK_50735265431b38042b357626756" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "action_parameter" ("order" integer NOT NULL, "enumValues" character varying, "isRequired" boolean NOT NULL, "description" character varying NOT NULL, "type" character varying NOT NULL, "name" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "actionId" uuid NOT NULL, CONSTRAINT "PK_7e91fd500c9b46de47ed5eeba7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "action_execution" ("executedAt" TIMESTAMP, "errorMessage" character varying, "responsePayload" character varying, "responseStatusCode" integer, "status" character varying NOT NULL, "requestPayload" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "actionId" uuid NOT NULL, "detectedIntentId" uuid NOT NULL, CONSTRAINT "PK_3350bdd440d16a818d3bb1c0fe3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" ADD CONSTRAINT "FK_b8b68bd7738f0c5c55dc7981c2e" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" ADD CONSTRAINT "FK_3a0248cb93ea8101f16ecc4ea9c" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "client" ADD CONSTRAINT "FK_3d7a0b6e0f1d0c0ab1bc189645f" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_ba585d4fe23759c5203d65b659b" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_3bd0d3cd0928f7348dfaecbb068" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_7cf4a4df1f2627f72bf6231635f" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action" ADD CONSTRAINT "FK_24e4f35dfccf55a2ff7637beaa9" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "detected_intent" ADD CONSTRAINT "FK_0afa64a155180ae7844127d78c3" FOREIGN KEY ("actionId") REFERENCES "action"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "detected_intent" ADD CONSTRAINT "FK_dccb86eba5ee5455d4992df81fe" FOREIGN KEY ("messageId") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" ADD CONSTRAINT "FK_c3009db3b4315829bf43e1ea711" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" ADD CONSTRAINT "FK_24e3f0ad735ec89bb235a395547" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_parameter" ADD CONSTRAINT "FK_66296acaa5a8454be9b11cbfb6d" FOREIGN KEY ("actionId") REFERENCES "action"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_execution" ADD CONSTRAINT "FK_feee6f0ca13f1cda0563bee70fe" FOREIGN KEY ("actionId") REFERENCES "action"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_execution" ADD CONSTRAINT "FK_2c13f804a340cf511ec4b02c3e9" FOREIGN KEY ("detectedIntentId") REFERENCES "detected_intent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "action_execution" DROP CONSTRAINT "FK_2c13f804a340cf511ec4b02c3e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_execution" DROP CONSTRAINT "FK_feee6f0ca13f1cda0563bee70fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "action_parameter" DROP CONSTRAINT "FK_66296acaa5a8454be9b11cbfb6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" DROP CONSTRAINT "FK_24e3f0ad735ec89bb235a395547"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_member" DROP CONSTRAINT "FK_c3009db3b4315829bf43e1ea711"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detected_intent" DROP CONSTRAINT "FK_dccb86eba5ee5455d4992df81fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detected_intent" DROP CONSTRAINT "FK_0afa64a155180ae7844127d78c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "action" DROP CONSTRAINT "FK_24e4f35dfccf55a2ff7637beaa9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_7cf4a4df1f2627f72bf6231635f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_3bd0d3cd0928f7348dfaecbb068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_ba585d4fe23759c5203d65b659b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "client" DROP CONSTRAINT "FK_3d7a0b6e0f1d0c0ab1bc189645f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" DROP CONSTRAINT "FK_3a0248cb93ea8101f16ecc4ea9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "resource" DROP CONSTRAINT "FK_b8b68bd7738f0c5c55dc7981c2e"`,
    );
    await queryRunner.query(`DROP TABLE "action_execution"`);
    await queryRunner.query(`DROP TABLE "action_parameter"`);
    await queryRunner.query(`DROP TABLE "company_member"`);
    await queryRunner.query(`DROP TABLE "detected_intent"`);
    await queryRunner.query(`DROP TABLE "action"`);
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP TABLE "conversation"`);
    await queryRunner.query(`DROP TABLE "client"`);
    await queryRunner.query(`DROP TABLE "resource"`);
    await queryRunner.query(`DROP TABLE "company"`);
  }
}
