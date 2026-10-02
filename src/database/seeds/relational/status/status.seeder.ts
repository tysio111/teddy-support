import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { StatusEntity } from '../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { StatusEnum } from '../../../../statuses/statuses.enum';

export class StatusSeeder implements Seeder {
  async run(dataSource: DataSource) {
    const repository = dataSource.getRepository(StatusEntity);

    const count = await repository.count();

    if (!count) {
      await repository.save([
        repository.create({
          id: StatusEnum.active,
          name: 'Active',
        }),
        repository.create({
          id: StatusEnum.inactive,
          name: 'Inactive',
        }),
      ]);
    }
  }
}
