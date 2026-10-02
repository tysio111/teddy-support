import { ClientEntity } from '../../../../clients/infrastructure/persistence/relational/entities/client.entity';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export class ClientSeeder implements Seeder {
  async run(dataSource: DataSource) {
    const repository = dataSource.getRepository(ClientEntity);

    const count = await repository.count();

    if (count === 0) {
      await repository.save([
        repository.create({
          name: 'Anna Kowalska',
          email: 'anna.kowalska@example.com',
          externalReference: 'CUST-10001',
        }),
        repository.create({
          name: 'Mark Schmidt',
          email: 'mark.schmidt@example.com',
          externalReference: 'CUST-10002',
        }),
        repository.create({
          name: 'Julia Novak',
          email: 'julia.novak@example.com',
          externalReference: 'CUST-10003',
        }),
        // Guest checkout: no account in the shop yet.
        repository.create({
          name: null,
          email: 'guest.buyer@example.com',
          externalReference: null,
        }),
      ]);
    }
  }
}
