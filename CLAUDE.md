# Project instructions

NestJS boilerplate supporting both relational (TypeORM/PostgreSQL) and document (Mongoose/MongoDB) persistence.

## When adding entities, schemas, or properties

Use the `generate` skill (auto-loaded from [.claude/skills/generate/SKILL.md](.claude/skills/generate/SKILL.md)). It documents the project's CLI generators (`npm run generate:resource:*`, `npm run add:property:to-*`) which keep both database variants, DTOs, modules, and migrations in sync. Do not hand-write entity files.

## Framework-agnostic logic (LangGraph graphs, pipelines, algorithms)

Write it as plain functions/classes with dependencies passed in explicitly (a typed `deps` object), not as an `@Injectable` with logic in private methods. Nest is only the wiring layer: register it with a `useFactory` provider and keep a thin service for the public API. Example: `src/intent-recognition/graph/` (`intent-graph.ts` + `intent-graph.provider.ts`).

When a service grows past ~300 lines or mixes orchestration with business steps, propose splitting it before adding more.
