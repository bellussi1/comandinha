import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SeedConfig } from './seed-config.js';
import { seedOwner } from './seed-owner.js';
import { seedDemo } from './seed-demo.js';
import { PrismaService } from '../src/database/prisma.service.js';

const prisma = new PrismaService();
const suffix = randomUUID();
const restaurantA = {
  slug: `seed-demo-a-${suffix}`,
  name: 'Seed Demo A',
};
const restaurantB = {
  slug: `seed-demo-b-${suffix}`,
  name: 'Seed Demo B',
};
const account = {
  name: 'Seed Demo Owner',
  email: `seed-demo-owner-${suffix}@example.test`,
};
const config: SeedConfig = {
  ownerName: account.name,
  ownerEmail: account.email,
  ownerPassword: 'seed-demo-password-12',
  restaurantName: restaurantA.name,
  restaurantSlug: restaurantA.slug,
};
const demoTableNames = ['Mesa 01', 'Mesa 02', 'Mesa 03'];
const demoCategoryNames = ['Hambúrgueres', 'Porções', 'Bebidas', 'Sobremesas'];
const demoProductNames = [
  'Smash clássico',
  'Cheeseburger da casa',
  'Batata rústica',
  'Anéis de cebola',
  'Refrigerante lata',
  'Suco de laranja',
  'Brownie de chocolate',
  'Pudim da casa',
];

let restaurantAId: string;
let restaurantBId: string;
let customTableId: string;
let customCategoryId: string;
let customProductId: string;
let editedProductId: string;
let canonicalDemoCategoryId: string;
let canonicalCategoryProductId: string;

beforeAll(async () => {
  await prisma.$connect();
  const [firstRestaurant, secondRestaurant] = await Promise.all([
    prisma.restaurant.create({ data: restaurantA }),
    prisma.restaurant.create({ data: restaurantB }),
  ]);
  restaurantAId = firstRestaurant.id;
  restaurantBId = secondRestaurant.id;

  const customTable = await prisma.restaurantTable.create({
    data: {
      restaurantId: restaurantAId,
      name: 'Minha mesa personalizada',
      publicCode: randomBytes(32).toString('base64url'),
    },
  });
  customTableId = customTable.id;

  const [customCategory, editedDemoCategory, canonicalDemoCategory] = await Promise.all([
    prisma.catalogCategory.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Favoritos do chef',
        nameNormalized: `favoritos-do-chef-${suffix}`,
        description: 'Minha categoria personalizada.',
      },
    }),
    prisma.catalogCategory.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Hambúrgueres',
        nameNormalized: 'hamburgueres',
        displayOrder: 99,
      },
    }),
    prisma.catalogCategory.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Hambúrgueres',
        nameNormalized: 'hambúrgueres',
        displayOrder: 98,
      },
    }),
  ]);
  customCategoryId = customCategory.id;
  canonicalDemoCategoryId = canonicalDemoCategory.id;

  const [customProduct, editedDemoProduct, canonicalCategoryProduct] = await Promise.all([
    prisma.catalogProduct.create({
      data: {
        restaurantId: restaurantAId,
        categoryId: customCategory.id,
        name: 'Prato especial',
        description: 'Produto fora do conjunto de demonstração.',
        priceInCents: 7777,
        featured: true,
      },
    }),
    prisma.catalogProduct.create({
      data: {
        restaurantId: restaurantAId,
        categoryId: editedDemoCategory.id,
        name: 'Smash clássico',
        description: 'Preço e descrição editados manualmente.',
        priceInCents: 3333,
      },
    }),
      prisma.catalogProduct.create({
        data: {
          restaurantId: restaurantAId,
          categoryId: canonicalDemoCategory.id,
          name: 'Produto da categoria canônica',
          description: 'Registro preservado durante a reconciliação.',
          priceInCents: 5555,
        },
      }),
    ]);
  customProductId = customProduct.id;
  editedProductId = editedDemoProduct.id;
  canonicalCategoryProductId = canonicalCategoryProduct.id;
});

afterAll(async () => {
  if (restaurantAId && restaurantBId) {
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantAId, restaurantBId] } },
    });
  }
  await prisma.user.deleteMany({ where: { email: account.email } });
  await prisma.$disconnect();
});

describe('local demo seed with PostgreSQL', () => {
  it('returns the owner restaurant id and preserves demo edits and unrelated records across runs', async () => {
    const owner = await seedOwner(prisma, config);
    expect(owner.restaurantId).toBe(restaurantAId);

    const customBefore = {
      table: await prisma.restaurantTable.findUniqueOrThrow({
        where: { id: customTableId },
      }),
      category: await prisma.catalogCategory.findUniqueOrThrow({
        where: { id: customCategoryId },
      }),
      product: await prisma.catalogProduct.findUniqueOrThrow({
        where: { id: customProductId },
      }),
    };

    await seedDemo(prisma, owner.restaurantId);
    const firstTables = await prisma.restaurantTable.findMany({
      where: { restaurantId: restaurantAId, name: { in: demoTableNames } },
      orderBy: { name: 'asc' },
    });
    const firstCodes = firstTables.map(({ name, publicCode }) => [
      name,
      publicCode,
    ]);
    await seedDemo(prisma, owner.restaurantId);

    const demoTables = await prisma.restaurantTable.findMany({
      where: { restaurantId: restaurantAId, name: { in: demoTableNames } },
      orderBy: { name: 'asc' },
    });
    const demoCategories = await prisma.catalogCategory.findMany({
      where: {
        restaurantId: restaurantAId,
        name: { in: demoCategoryNames },
      },
    });
    const demoProducts = await prisma.catalogProduct.findMany({
      where: {
        restaurantId: restaurantAId,
        name: { in: demoProductNames },
      },
    });

    expect(demoTables).toHaveLength(3);
    expect(
      demoTables.map(({ name, publicCode }) => [name, publicCode]),
    ).toEqual(firstCodes);
    expect(
      demoTables.every(({ publicCode }) =>
        /^[A-Za-z0-9_-]{43}$/.test(publicCode),
      ),
    ).toBe(true);
    expect(demoCategories).toHaveLength(4);
    expect(
      await prisma.catalogCategory.count({
        where: {
          restaurantId: restaurantAId,
          nameNormalized: 'hamburgueres',
        },
      }),
    ).toBe(0);
    await expect(
      prisma.catalogCategory.findUniqueOrThrow({
        where: {
          restaurantId_nameNormalized: {
            restaurantId: restaurantAId,
            nameNormalized: 'hambúrgueres',
          },
        },
      }),
    ).resolves.toMatchObject({ id: canonicalDemoCategoryId });
    await expect(
      prisma.catalogProduct.findUniqueOrThrow({
        where: { id: canonicalCategoryProductId },
      }),
    ).resolves.toMatchObject({ categoryId: canonicalDemoCategoryId });
    await expect(
      prisma.catalogProduct.findUniqueOrThrow({
        where: { id: editedProductId },
      }),
    ).resolves.toMatchObject({ categoryId: canonicalDemoCategoryId });
    expect(demoCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Hambúrgueres',
          nameNormalized: 'hambúrgueres',
        }),
        expect.objectContaining({ name: 'Porções', nameNormalized: 'porções' }),
      ]),
    );
    expect(demoProducts).toHaveLength(8);
    await expect(
      prisma.catalogProduct.findUniqueOrThrow({
        where: { id: editedProductId },
      }),
    ).resolves.toMatchObject({
      name: 'Smash clássico',
      description: 'Preço e descrição editados manualmente.',
      priceInCents: 3333,
    });

    expect({
      table: await prisma.restaurantTable.findUniqueOrThrow({
        where: { id: customTableId },
      }),
      category: await prisma.catalogCategory.findUniqueOrThrow({
        where: { id: customCategoryId },
      }),
      product: await prisma.catalogProduct.findUniqueOrThrow({
        where: { id: customProductId },
      }),
    }).toEqual(customBefore);

    expect(
      await prisma.restaurantTable.count({
        where: { restaurantId: restaurantBId, name: { in: demoTableNames } },
      }),
    ).toBe(0);
    expect(
      await prisma.catalogCategory.count({
        where: { restaurantId: restaurantBId, name: { in: demoCategoryNames } },
      }),
    ).toBe(0);
    expect(
      await prisma.catalogProduct.count({
        where: { restaurantId: restaurantBId, name: { in: demoProductNames } },
      }),
    ).toBe(0);
  });
});
