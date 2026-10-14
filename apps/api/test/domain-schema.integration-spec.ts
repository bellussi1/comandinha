import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service.js';

const prisma = new PrismaService();
const suffix = randomUUID();
const restaurantA = {
  slug: `schema-a-${suffix}`,
  name: 'Schema Restaurant A',
};
const restaurantB = {
  slug: `schema-b-${suffix}`,
  name: 'Schema Restaurant B',
};

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  const fixtures = await prisma.restaurant.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'schema-a-' } },
        { slug: { startsWith: 'schema-b-' } },
      ],
    },
    select: { id: true },
  });
  const fixtureIds = fixtures.map(({ id }) => id);
  if (fixtureIds.length > 0) {
    await prisma.order.deleteMany({
      where: { restaurantId: { in: fixtureIds } },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: fixtureIds } },
    });
  }
  await prisma.$disconnect();
});

describe('restaurant tables and order history schema', () => {
  it('stores table sessions with tenant-safe order links and one open session per table', async () => {
    const relation = await prisma.$queryRaw<Array<{ is_present: boolean }>>`
      SELECT to_regclass('public."DiningSession"') IS NOT NULL AS is_present
    `;
    expect(relation[0]?.is_present).toBe(true);

    const [first, second] = await Promise.all([
      prisma.restaurant.create({
        data: {
          slug: `schema-a-session-${randomUUID()}`,
          name: 'Schema Session Restaurant A',
        },
      }),
      prisma.restaurant.create({
        data: {
          slug: `schema-b-session-${randomUUID()}`,
          name: 'Schema Session Restaurant B',
        },
      }),
    ]);
    const tableId = randomUUID();
    const secondTableId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "RestaurantTable"
        ("id", "restaurantId", "name", "publicCode", "createdAt", "updatedAt")
      VALUES
        (${secondTableId}::uuid, ${second.id}::uuid, 'Mesa de outro restaurante', ${Buffer.from(randomUUID()).toString('base64url')}, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "RestaurantTable"
        ("id", "restaurantId", "name", "publicCode", "createdAt", "updatedAt")
      VALUES
        (${tableId}::uuid, ${first.id}::uuid, 'Mesa de sessão', ${Buffer.from(randomUUID()).toString('base64url')}, NOW(), NOW())
    `;

    const legacyOrderId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Order"
        ("id", "restaurantId", "tableId", "totalInCents", "createdAt", "updatedAt")
      VALUES
        (${legacyOrderId}::uuid, ${first.id}::uuid, ${tableId}::uuid, 1200, NOW(), NOW())
    `;
    const legacyOrder = await prisma.$queryRaw<
      Array<{ diningSessionId: string | null }>
    >`
      SELECT "diningSessionId" FROM "Order" WHERE "id" = ${legacyOrderId}::uuid
    `;
    expect(legacyOrder[0]?.diningSessionId).toBeNull();

    const openSessionId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "DiningSession"
        ("id", "restaurantId", "tableId", "status", "openedAt", "createdAt", "updatedAt")
      VALUES
        (${openSessionId}::uuid, ${first.id}::uuid, ${tableId}::uuid, 'OPEN'::"DiningSessionStatus", NOW(), NOW(), NOW())
    `;

    await expect(prisma.$executeRaw`
      INSERT INTO "DiningSession"
        ("id", "restaurantId", "tableId", "status", "openedAt", "createdAt", "updatedAt")
      VALUES
        (${randomUUID()}::uuid, ${first.id}::uuid, ${tableId}::uuid, 'OPEN'::"DiningSessionStatus", NOW(), NOW(), NOW())
    `).rejects.toThrow();

    await expect(prisma.$executeRaw`
      INSERT INTO "DiningSession"
        ("id", "restaurantId", "tableId", "status", "openedAt", "createdAt", "updatedAt")
      VALUES
        (${randomUUID()}::uuid, ${second.id}::uuid, ${tableId}::uuid, 'OPEN'::"DiningSessionStatus", NOW(), NOW(), NOW())
    `).rejects.toThrow();

    const linkedOrderId = randomUUID();
    await expect(prisma.$executeRaw`
      INSERT INTO "Order"
        ("id", "restaurantId", "tableId", "diningSessionId", "totalInCents", "createdAt", "updatedAt")
      VALUES
        (${linkedOrderId}::uuid, ${second.id}::uuid, ${secondTableId}::uuid, ${openSessionId}::uuid, 1200, NOW(), NOW())
    `).rejects.toThrow();
  });

  it('creates tenant-linked records and rejects duplicate codes and cross-tenant relations', async () => {
    const [first, second] = await Promise.all([
      prisma.restaurant.create({ data: restaurantA }),
      prisma.restaurant.create({ data: restaurantB }),
    ]);
    const [firstCategory, secondCategory] = await Promise.all([
      prisma.catalogCategory.create({
        data: {
          restaurantId: first.id,
          name: 'Categoria A',
          nameNormalized: `categoria-a-${suffix}`,
        },
      }),
      prisma.catalogCategory.create({
        data: {
          restaurantId: second.id,
          name: 'Categoria B',
          nameNormalized: `categoria-b-${suffix}`,
        },
      }),
    ]);
    const [firstProduct, secondProduct] = await Promise.all([
      prisma.catalogProduct.create({
        data: {
          restaurantId: first.id,
          categoryId: firstCategory.id,
          name: 'Produto do restaurante A',
          priceInCents: 1_200,
        },
      }),
      prisma.catalogProduct.create({
        data: {
          restaurantId: second.id,
          categoryId: secondCategory.id,
          name: 'Produto de outro restaurante',
          priceInCents: 1_200,
        },
      }),
    ]);
    const tableId = randomUUID();
    const orderId = randomUUID();
    const publicCode = Buffer.from(randomUUID()).toString('base64url');

    await prisma.$executeRaw`
      INSERT INTO "RestaurantTable"
        ("id", "restaurantId", "name", "publicCode", "isActive", "createdAt", "updatedAt")
      VALUES
        (${tableId}::uuid, ${first.id}::uuid, 'Mesa de teste', ${publicCode}, true, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "Order"
        ("id", "restaurantId", "tableId", "status", "totalInCents", "createdAt", "updatedAt")
      VALUES
        (${orderId}::uuid, ${first.id}::uuid, ${tableId}::uuid, 'PENDING'::"OrderStatus", 2_400, NOW(), NOW())
    `;
    await prisma.$executeRaw`
      INSERT INTO "OrderItem"
        ("id", "restaurantId", "orderId", "productId", "nameSnapshot", "unitPriceInCents", "quantity", "lineTotalInCents")
      VALUES
        (${randomUUID()}::uuid, ${first.id}::uuid, ${orderId}::uuid, ${firstProduct.id}::uuid, 'Snapshot', 1_200, 2, 2_400)
    `;

    await expect(
      prisma.$executeRaw`
        INSERT INTO "RestaurantTable"
          ("id", "restaurantId", "name", "publicCode", "isActive", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}::uuid, ${second.id}::uuid, 'Mesa duplicada', ${publicCode}, true, NOW(), NOW())
      `,
    ).rejects.toThrow();

    await expect(
      prisma.$executeRaw`
        INSERT INTO "Order"
          ("id", "restaurantId", "tableId", "status", "totalInCents", "createdAt", "updatedAt")
        VALUES
          (${randomUUID()}::uuid, ${second.id}::uuid, ${tableId}::uuid, 'PENDING'::"OrderStatus", 0, NOW(), NOW())
      `,
    ).rejects.toThrow();

    await expect(
      prisma.$executeRaw`
        INSERT INTO "OrderItem"
          ("id", "restaurantId", "orderId", "productId", "nameSnapshot", "unitPriceInCents", "quantity", "lineTotalInCents")
        VALUES
          (${randomUUID()}::uuid, ${first.id}::uuid, ${orderId}::uuid, ${secondProduct.id}::uuid, 'Produto cruzado', 1_200, 1, 1_200)
      `,
    ).rejects.toThrow();

    expect(first.id).not.toBe(second.id);
  });
});
