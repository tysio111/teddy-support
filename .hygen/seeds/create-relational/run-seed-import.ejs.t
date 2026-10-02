---
inject: true
to: src/database/seeds/relational/run-seed.ts
after: typeorm-extension
---
import { <%= name %>Seeder } from './<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.seeder';