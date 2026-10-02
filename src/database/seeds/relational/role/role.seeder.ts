import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { RoleEntity } from '../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { RoleEnum } from '../../../../roles/roles.enum';

export class RoleSeeder implements Seeder {
  async run(dataSource: DataSource) {
    const repository = dataSource.getRepository(RoleEntity);

    const countUser = await repository.count({
      where: {
        id: RoleEnum.user,
      },
    });

    if (!countUser) {
      await repository.save(
        repository.create({
          id: RoleEnum.user,
          name: 'User',
        }),
      );
    }

    const countAdmin = await repository.count({
      where: {
        id: RoleEnum.admin,
      },
    });

    if (!countAdmin) {
      await repository.save(
        repository.create({
          id: RoleEnum.admin,
          name: 'Admin',
        }),
      );
    }
  }
}
