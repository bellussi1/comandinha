import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '../src/generated/prisma/client.js';

const demoTables = ['Mesa 01', 'Mesa 02', 'Mesa 03'] as const;

const demoCategories = [
  {
    name: 'Hambúrgueres',
    nameNormalized: 'hamburgueres',
    description: 'Hambúrgueres preparados na casa.',
    displayOrder: 0,
  },
  {
    name: 'Porções',
    nameNormalized: 'porcoes',
    description: 'Porções para compartilhar.',
    displayOrder: 1,
  },
  {
    name: 'Bebidas',
    nameNormalized: 'bebidas',
    description: 'Bebidas geladas e sucos.',
    displayOrder: 2,
  },
  {
    name: 'Sobremesas',
    nameNormalized: 'sobremesas',
    description: 'Doces feitos para fechar o pedido.',
    displayOrder: 3,
  },
] as const;

const demoProducts = [
  {
    categoryNameNormalized: 'hamburgueres',
    name: 'Smash clássico',
    description: 'Pão, carne smash, queijo e molho da casa.',
    priceInCents: 2990,
  },
  {
    categoryNameNormalized: 'hamburgueres',
    name: 'Cheeseburger da casa',
    description: 'Carne, queijo, cebola caramelizada e molho especial.',
    priceInCents: 3490,
  },
  {
    categoryNameNormalized: 'porcoes',
    name: 'Batata rústica',
    description: 'Batatas temperadas e assadas com ervas.',
    priceInCents: 1800,
  },
  {
    categoryNameNormalized: 'porcoes',
    name: 'Anéis de cebola',
    description: 'Anéis de cebola empanados e crocantes.',
    priceInCents: 1600,
  },
  {
    categoryNameNormalized: 'bebidas',
    name: 'Refrigerante lata',
    description: 'Lata de refrigerante de 350 ml.',
    priceInCents: 700,
  },
  {
    categoryNameNormalized: 'bebidas',
    name: 'Suco de laranja',
    description: 'Suco de laranja natural, 300 ml.',
    priceInCents: 1200,
  },
  {
    categoryNameNormalized: 'sobremesas',
    name: 'Brownie de chocolate',
    description: 'Brownie de chocolate servido em porção individual.',
    priceInCents: 1400,
  },
  {
    categoryNameNormalized: 'sobremesas',
    name: 'Pudim da casa',
    description: 'Pudim tradicional com calda de caramelo.',
    priceInCents: 1000,
  },
] as const;

export async function seedDemo(
  prisma: PrismaClient,
  restaurantId: string,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const name of demoTables) {
      await transaction.restaurantTable.upsert({
        where: { restaurantId_name: { restaurantId, name } },
        create: {
          restaurantId,
          name,
          publicCode: randomBytes(32).toString('base64url'),
        },
        update: {},
      });
    }

    for (const category of demoCategories) {
      await transaction.catalogCategory.upsert({
        where: {
          restaurantId_nameNormalized: {
            restaurantId,
            nameNormalized: category.nameNormalized,
          },
        },
        create: { restaurantId, ...category },
        update: {
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder,
        },
      });
    }

    const categories = await transaction.catalogCategory.findMany({
      where: {
        restaurantId,
        nameNormalized: {
          in: demoCategories.map(({ nameNormalized }) => nameNormalized),
        },
      },
      select: { id: true, nameNormalized: true },
    });
    const categoryIds = new Map(
      categories.map(({ id, nameNormalized }) => [nameNormalized, id]),
    );

    for (const product of demoProducts) {
      const categoryId = categoryIds.get(product.categoryNameNormalized);
      if (!categoryId) {
        throw new Error(
          `Demo category ${product.categoryNameNormalized} was not created.`,
        );
      }

      const existingProduct = await transaction.catalogProduct.findFirst({
        where: {
          restaurantId,
          categoryId,
          name: product.name,
        },
        select: { id: true },
      });
      if (existingProduct) continue;

      await transaction.catalogProduct.create({
        data: {
          restaurantId,
          categoryId,
          name: product.name,
          description: product.description,
          priceInCents: product.priceInCents,
        },
      });
    }
  });
}
