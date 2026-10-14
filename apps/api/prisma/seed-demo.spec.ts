import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { normalizeCategoryName } from '../src/catalog/catalog-access.js';
import { seedDemo } from './seed-demo.js';

describe('seedDemo category key migration', () => {
  it('reuses old accentless demo categories with the API normalizer', async () => {
    const categoryIds = [
      { id: 'category-burgers', nameNormalized: 'hambúrgueres' },
      { id: 'category-portions', nameNormalized: 'porções' },
      { id: 'category-drinks', nameNormalized: 'bebidas' },
      { id: 'category-desserts', nameNormalized: 'sobremesas' },
    ];
    const transaction = {
      restaurantTable: { upsert: vi.fn() },
      catalogCategory: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn(
          async ({ where }: { where: { nameNormalized: string } }) => {
            if (where.nameNormalized === 'hamburgueres')
              return { id: 'category-burgers' };
            if (where.nameNormalized === 'porcoes')
              return { id: 'category-portions' };
            return null;
          },
        ),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn().mockResolvedValue(categoryIds),
      },
      catalogProduct: {
        findFirst: vi.fn().mockResolvedValue({ id: 'existing-demo-product' }),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    } as unknown as PrismaClient;

    await seedDemo(prisma, 'restaurant-id');

    expect(transaction.catalogCategory.update).toHaveBeenCalledWith({
      where: { id: 'category-burgers' },
      data: expect.objectContaining({
        name: 'Hambúrgueres',
        nameNormalized: normalizeCategoryName('Hambúrgueres'),
      }),
    });
    expect(transaction.catalogCategory.update).toHaveBeenCalledWith({
      where: { id: 'category-portions' },
      data: expect.objectContaining({
        name: 'Porções',
        nameNormalized: normalizeCategoryName('Porções'),
      }),
    });
    expect(transaction.catalogCategory.upsert).toHaveBeenCalledTimes(2);
    expect(transaction.catalogProduct.create).not.toHaveBeenCalled();
  });
});
