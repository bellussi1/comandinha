import { PrismaService } from '../src/database/prisma.service.js';
import { parseSeedConfig } from './seed-config.js';
import { seedOwner } from './seed-owner.js';

const config = parseSeedConfig(process.env);
const prisma = new PrismaService();

try {
  await prisma.$connect();
  await seedOwner(prisma, config);
  console.info('Local Comandinha owner and restaurant are ready.');
} catch {
  console.error(
    'Local Comandinha seed failed. Check the local database and environment configuration.',
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
