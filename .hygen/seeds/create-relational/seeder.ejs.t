---
to: src/database/seeds/relational/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.seeder.ts
---
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { <%= name %>Entity } from '../../../../<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>/infrastructure/persistence/relational/entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.entity';

export class <%= name %>Seeder implements Seeder {
  async run(dataSource: DataSource) {
    const repository = dataSource.getRepository(<%= name %>Entity);

    const count = await repository.count();

    if (count === 0) {
      await repository.save(repository.create({}));
    }
  }
}
