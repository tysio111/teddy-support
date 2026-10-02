import 'dotenv/config';
import { runSeeders } from 'typeorm-extension';
import { AppDataSource } from '../../data-source';
import { ActionSeeder } from './action/action.seeder';
import { ClientSeeder } from './client/client.seeder';
import { ConversationSeeder } from './conversation/conversation.seeder';
import { ResourceSeeder } from './resource/resource.seeder';
import { RoleSeeder } from './role/role.seeder';
import { StatusSeeder } from './status/status.seeder';
import { UserSeeder } from './user/user.seeder';

const runSeed = async () => {
  await AppDataSource.initialize();

  // Seeders run in this order (later ones depend on rows from earlier ones).
  await runSeeders(AppDataSource, {
    seeds: [
      RoleSeeder,
      StatusSeeder,
      UserSeeder,
      ActionSeeder,
      ClientSeeder,
      ConversationSeeder,
      ResourceSeeder,
    ],
  });

  await AppDataSource.destroy();
};

void runSeed();
