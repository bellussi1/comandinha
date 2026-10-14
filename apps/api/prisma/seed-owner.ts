import type { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/password-hasher.js';
import type { SeedConfig } from './seed-config.js';

export async function seedOwner(
  prisma: PrismaClient,
  config: SeedConfig,
): Promise<{ restaurantId: string }> {
  const passwordHash = await hashPassword(config.ownerPassword);

  return prisma.$transaction(async (transaction) => {
    const restaurant = await transaction.restaurant.upsert({
      where: { slug: config.restaurantSlug },
      create: { name: config.restaurantName, slug: config.restaurantSlug },
      update: { name: config.restaurantName },
      select: { id: true },
    });
    const user = await transaction.user.upsert({
      where: { email: config.ownerEmail },
      create: {
        name: config.ownerName,
        email: config.ownerEmail,
        passwordHash,
        isActive: true,
      },
      update: { name: config.ownerName, passwordHash, isActive: true },
      select: { id: true },
    });

    await transaction.membership.upsert({
      where: {
        userId_restaurantId: { userId: user.id, restaurantId: restaurant.id },
      },
      create: {
        userId: user.id,
        restaurantId: restaurant.id,
        role: 'OWNER',
        isActive: true,
      },
      update: { role: 'OWNER', isActive: true },
    });

    return { restaurantId: restaurant.id };
  });
}
