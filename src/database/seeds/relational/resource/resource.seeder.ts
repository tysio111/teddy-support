import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { FileEntity } from '../../../../files/infrastructure/persistence/relational/entities/file.entity';
import { ResourceEntity } from '../../../../resources/infrastructure/persistence/relational/entities/resource.entity';

// Help center articles for the knowledge base, in ./docs. Attached as local
// files (FILE_DRIVER=local), ready to index with POST /resources/:id/index.
const RESOURCES = [
  ['Shipping policy', 'policy', 'shipping-policy'],
  ['Returns and refunds policy', 'policy', 'returns-policy'],
  ['Payment methods', 'faq', 'payment-methods'],
  ['Size guide', 'guide', 'size-guide'],
  ['Discount codes and promotions', 'faq', 'promotions'],
  ['Terms and conditions', 'policy', 'terms'],
];

export class ResourceSeeder implements Seeder {
  async run(dataSource: DataSource) {
    const resources = dataSource.getRepository(ResourceEntity);
    const files = dataSource.getRepository(FileEntity);
    const apiPrefix = process.env.API_PREFIX || 'api';

    await mkdir('./files', { recursive: true });

    for (const [title, type, slug] of RESOURCES) {
      const sourceUrl = `https://shop.example.com/help/${slug}`;
      const resource =
        (await resources.findOne({ where: { sourceUrl } })) ??
        resources.create({
          title,
          type,
          sourceUrl,
          status: 'active',
          vectorRef: null,
        });

      // Also backfills resources seeded before they had documents.
      if (!resource.file) {
        const fileName = `${slug}.md`;
        await copyFile(
          join(__dirname, 'docs', fileName),
          join('./files', fileName),
        );
        resource.file = await files.save(
          files.create({ path: `/${apiPrefix}/v1/files/${fileName}` }),
        );
      }

      await resources.save(resource);
    }
  }
}
