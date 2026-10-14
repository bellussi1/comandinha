import { PrismaService } from '../src/database/prisma.service.js';
import { parseSeedConfig } from './seed-config.js';
import { seedDemo } from './seed-demo.js';
import { seedOwner } from './seed-owner.js';

const config = parseSeedConfig(process.env);
const prisma = new PrismaService();

try {
  await prisma.$connect();
  const owner = await seedOwner(prisma, config);
  await seedDemo(prisma, owner.restaurantId);
  console.info(
    'Local Comandinha owner, restaurant, tables and menu are ready.',
  );
} catch {
  console.error(
    'Local Comandinha seed failed. Check the local database and environment configuration.',
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
