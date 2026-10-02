import { ResourceEntity } from '../../../../resources/infrastructure/persistence/relational/entities/resource.entity';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export class ResourceSeeder implements Seeder {
  async run(dataSource: DataSource) {
    const repository = dataSource.getRepository(ResourceEntity);

    const count = await repository.count();

    if (count === 0) {
      await repository.save(
        [
          ['Shipping policy', 'policy', 'shipping-policy'],
          ['Returns and refunds policy', 'policy', 'returns-policy'],
          ['Payment methods', 'faq', 'payment-methods'],
          ['Size guide', 'guide', 'size-guide'],
          ['Discount codes and promotions', 'faq', 'promotions'],
          ['Terms and conditions', 'policy', 'terms'],
        ].map(([title, type, slug]) =>
          repository.create({
            title,
            type,
            sourceUrl: `https://shop.example.com/help/${slug}`,
            status: 'active',
            vectorRef: null,
          }),
        ),
      );
    }
  }
}
