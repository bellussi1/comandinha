import { randomBytes, randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service.js';
import { OrderStatus } from '../src/generated/prisma/client.js';
import { configureOpenApi } from '../src/openapi.js';
import { AppModule } from '../src/app.module.js';

const prisma = new PrismaService();
const gatewaySecret = randomBytes(32).toString('base64url');
const suffix = randomUUID();
const restaurantA = {
  slug: `public-dining-a-${suffix}`,
  name: 'Public Dining A',
};
const restaurantB = {
  slug: `public-dining-b-${suffix}`,
  name: 'Public Dining B',
};

let app: INestApplication | undefined;
let baseUrl: string;
let restaurantAId: string;
let restaurantBId: string;
let tableCode: string;
let inactiveTableCode: string;
let productAId: string;
let unavailableProductId: string;
let otherTenantProductId: string;

async function request(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    gateway?: boolean;
    clientKey?: string;
  } = {},
): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: options.method ?? 'GET',
    headers: {
      ...(options.gateway
        ? { 'x-comandinha-gateway-secret': gatewaySecret }
        : {}),
      'x-comandinha-client-key':
        options.clientKey ?? randomBytes(32).toString('hex'),
      ...(options.body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
}

async function submitOrder(code: string, body: unknown, gateway = true) {
  return request(`/public/tables/${code}/orders`, {
    method: 'POST',
    body,
    gateway,
  });
}

async function countOrdersForTable(tableId: string): Promise<number> {
  return prisma.order.count({ where: { tableId } });
}

beforeAll(async () => {
  process.env.AUTH_GATEWAY_SECRET = gatewaySecret;
  await prisma.$connect();
  const [firstRestaurant, secondRestaurant] = await Promise.all([
    prisma.restaurant.create({ data: restaurantA }),
    prisma.restaurant.create({ data: restaurantB }),
  ]);
  restaurantAId = firstRestaurant.id;
  restaurantBId = secondRestaurant.id;

  const [table, inactiveTable] = await Promise.all([
    prisma.restaurantTable.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Mesa pública',
        publicCode: randomBytes(32).toString('base64url'),
      },
    }),
    prisma.restaurantTable.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Mesa desativada',
        publicCode: randomBytes(32).toString('base64url'),
        isActive: false,
      },
    }),
  ]);
  tableCode = table.publicCode;
  inactiveTableCode = inactiveTable.publicCode;

  const [categoryA, emptyCategory, categoryB] = await Promise.all([
    prisma.catalogCategory.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Cardápio principal',
        nameNormalized: 'cardapio-principal',
        displayOrder: 1,
      },
    }),
    prisma.catalogCategory.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Categoria vazia',
        nameNormalized: 'categoria-vazia',
        displayOrder: 2,
      },
    }),
    prisma.catalogCategory.create({
      data: {
        restaurantId: restaurantBId,
        name: 'Outro restaurante',
        nameNormalized: 'outro-restaurante',
      },
    }),
  ]);

  const [
    mainProduct,
    secondActiveProduct,
    unavailableProduct,
    archivedProduct,
    otherTenantProduct,
  ] = await Promise.all([
    prisma.catalogProduct.create({
      data: {
        restaurantId: restaurantAId,
        categoryId: categoryA.id,
        name: 'Smash da casa',
        description: 'Pão, carne e queijo.',
        priceInCents: 2990,
        featured: true,
        dietaryTags: ['artesanal'],
      },
    }),
    prisma.catalogProduct.create({
      data: {
        restaurantId: restaurantAId,
        categoryId: categoryA.id,
        name: 'Agua com gas',
        priceInCents: 600,
      },
    }),
    prisma.catalogProduct.create({
      data: {
        restaurantId: restaurantAId,
        categoryId: categoryA.id,
        name: 'Indisponível',
        priceInCents: 700,
        available: false,
      },
    }),
    prisma.catalogProduct.create({
      data: {
        restaurantId: restaurantAId,
        categoryId: categoryA.id,
        name: 'Arquivado',
        priceInCents: 800,
        isActive: false,
      },
    }),
    prisma.catalogProduct.create({
      data: {
        restaurantId: restaurantBId,
        categoryId: categoryB.id,
        name: 'Produto de outro restaurante',
        priceInCents: 1200,
      },
    }),
  ]);
  productAId = mainProduct.id;
  unavailableProductId = unavailableProduct.id;
  otherTenantProductId = otherTenantProduct.id;
  expect(secondActiveProduct.id).toBeTruthy();
  expect(emptyCategory.id).toBeTruthy();
  expect(archivedProduct.id).toBeTruthy();

  app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  configureOpenApi(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  if (app) await app.close();
  if (restaurantAId && restaurantBId) {
    await prisma.order.deleteMany({
      where: { restaurantId: { in: [restaurantAId, restaurantBId] } },
    });
    await prisma.restaurant.deleteMany({
      where: { id: { in: [restaurantAId, restaurantBId] } },
    });
  }
  await prisma.$disconnect();
  delete process.env.AUTH_GATEWAY_SECRET;
});

describe('public QR menu and ordering with PostgreSQL', () => {
  it('serves a minimal active menu without credentials and hides invalid or inactive codes', async () => {
    const response = await request(`/public/tables/${tableCode}/menu`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      restaurant: { name: restaurantA.name },
      table: { name: 'Mesa pública' },
      categories: [
        {
          id: expect.any(String),
          name: 'Cardápio principal',
          description: null,
          products: [
            expect.objectContaining({
              name: 'Agua com gas',
              priceInCents: 600,
            }),
            expect.objectContaining({
              name: 'Smash da casa',
              description: 'Pão, carne e queijo.',
              priceInCents: 2990,
              featured: true,
              dietaryTags: ['artesanal'],
            }),
          ],
        },
      ],
    });

    for (const code of ['unknown', inactiveTableCode]) {
      expect((await request(`/public/tables/${code}/menu`)).status).toBe(404);
      expect((await request(`/public/tables/${code}/orders`)).status).toBe(404);
      expect(
        (
          await submitOrder(code, {
            requestId: randomUUID(),
            items: [{ productId: productAId, quantity: 1 }],
          })
        ).status,
      ).toBe(404);
    }
  });

  it('requires the server gateway for submission, ignores client prices and returns server totals', async () => {
    const before = await countOrdersForTable(
      (
        await prisma.restaurantTable.findUniqueOrThrow({
          where: { publicCode: tableCode },
        })
      ).id,
    );
    expect(
      (
        await submitOrder(
          tableCode,
          {
            requestId: randomUUID(),
            items: [{ productId: productAId, quantity: 1 }],
          },
          false,
        )
      ).status,
    ).toBe(401);

    const forged = await submitOrder(tableCode, {
      requestId: randomUUID(),
      items: [{ productId: productAId, quantity: 1, priceInCents: 1 }],
      totalInCents: 1,
    });
    expect(forged.status).toBe(400);
    expect(
      await countOrdersForTable(
        (
          await prisma.restaurantTable.findUniqueOrThrow({
            where: { publicCode: tableCode },
          })
        ).id,
      ),
    ).toBe(before);

    await prisma.catalogProduct.update({
      where: { id: productAId },
      data: { priceInCents: 3100 },
    });

    const response = await submitOrder(tableCode, {
      requestId: randomUUID(),
      notes: 'Sem cebola',
      items: [{ productId: productAId, quantity: 2, notes: 'Bem passado' }],
    });
    expect(response.status).toBe(201);
    const order = (await response.json()) as {
      id: string;
      status: OrderStatus;
      totalInCents: number;
      items: Array<{
        nameSnapshot: string;
        quantity: number;
        unitPriceInCents: number;
        lineTotalInCents: number;
      }>;
    };
    expect(order).toMatchObject({
      status: OrderStatus.PENDING,
      totalInCents: 6200,
      items: [
        {
          nameSnapshot: 'Smash da casa',
          quantity: 2,
          unitPriceInCents: 3100,
          lineTotalInCents: 6200,
        },
      ],
    });

    await prisma.catalogProduct.update({
      where: { id: productAId },
      data: { name: 'Nome atualizado depois do pedido', priceInCents: 9000 },
    });

    const summaries = await request(`/public/tables/${tableCode}/orders`);
    expect(summaries.status).toBe(200);
    const summaryList = (await summaries.json()) as Array<
      Record<string, unknown>
    >;
    expect(summaryList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: order.id, totalInCents: 6200 }),
      ]),
    );
    expect(summaryList[0]).not.toHaveProperty('notes');
    expect(summaryList[0]).not.toHaveProperty('restaurantId');
    expect(summaryList[0]).not.toHaveProperty('tableId');
    expect(summaryList[0]).not.toHaveProperty('customer');
    expect(summaryList[0].items).toEqual([
      expect.objectContaining({
        nameSnapshot: 'Smash da casa',
        quantity: 2,
        unitPriceInCents: 3100,
      }),
    ]);
    expect(
      (summaryList[0].items as Array<Record<string, unknown>>)[0],
    ).not.toHaveProperty('notes');
  });

  it('returns the existing order when the same client request is retried', async () => {
    const table = await prisma.restaurantTable.findUniqueOrThrow({
      where: { publicCode: tableCode },
      select: { id: true },
    });
    const requestId = randomUUID();
    const payload = {
      requestId,
      items: [{ productId: productAId, quantity: 1 }],
    };
    const before = await countOrdersForTable(table.id);

    const first = await submitOrder(tableCode, payload);
    expect(first.status).toBe(201);
    const firstOrder = (await first.json()) as { id: string };

    const retry = await submitOrder(tableCode, payload);
    expect(retry.status).toBe(201);
    await expect(retry.json()).resolves.toMatchObject({ id: firstOrder.id });
    expect(await countOrdersForTable(table.id)).toBe(before + 1);
  });

  it('rejects invalid items without creating partial orders', async () => {
    const tableId = (
      await prisma.restaurantTable.findUniqueOrThrow({
        where: { publicCode: tableCode },
      })
    ).id;
    const before = await countOrdersForTable(tableId);
    const edgeCategory = await prisma.catalogCategory.create({
      data: {
        restaurantId: restaurantAId,
        name: `Edge prices ${suffix}`,
        nameNormalized: `edge-prices-${suffix}`,
      },
    });
    const [maximumPriceProduct, oneCentProduct] = await Promise.all([
      prisma.catalogProduct.create({
        data: {
          restaurantId: restaurantAId,
          categoryId: edgeCategory.id,
          name: 'Preço máximo suportado',
          priceInCents: 2_147_483_647,
        },
      }),
      prisma.catalogProduct.create({
        data: {
          restaurantId: restaurantAId,
          categoryId: edgeCategory.id,
          name: 'Item de um centavo',
          priceInCents: 1,
        },
      }),
    ]);
    const invalidBodies = [
      { items: [] },
      { items: [{ productId: productAId, quantity: 0 }] },
      { items: [{ productId: productAId, quantity: 21 }] },
      {
        items: [{ productId: productAId, quantity: 1, notes: 'x'.repeat(201) }],
      },
      {
        notes: 'x'.repeat(201),
        items: [{ productId: productAId, quantity: 1 }],
      },
      {
        items: Array.from({ length: 51 }, () => ({
          productId: productAId,
          quantity: 1,
        })),
      },
      {
        items: [
          { productId: productAId, quantity: 1 },
          { productId: productAId, quantity: 2 },
        ],
      },
      { items: [{ productId: unavailableProductId, quantity: 1 }] },
      { items: [{ productId: otherTenantProductId, quantity: 1 }] },
      { items: [{ productId: maximumPriceProduct.id, quantity: 2 }] },
      {
        items: [
          { productId: maximumPriceProduct.id, quantity: 1 },
          { productId: oneCentProduct.id, quantity: 1 },
        ],
      },
    ];
    for (const body of invalidBodies) {
      const response = await submitOrder(tableCode, {
        requestId: randomUUID(),
        ...body,
      });
      expect([400, 409]).toContain(response.status);
    }
    expect(await countOrdersForTable(tableId)).toBe(before);
  });

  it('limits summaries to 20 newest orders and does not expose order notes', async () => {
    const table = await prisma.restaurantTable.findUniqueOrThrow({
      where: { publicCode: tableCode },
    });
    const now = Date.now();
    await prisma.order.createMany({
      data: Array.from({ length: 21 }, (_, index) => ({
        id: randomUUID(),
        restaurantId: restaurantAId,
        tableId: table.id,
        status: OrderStatus.PENDING,
        notes: `private note ${index}`,
        totalInCents: 100,
        createdAt: new Date(now + index * 1000),
        updatedAt: new Date(now + index * 1000),
      })),
    });

    const response = await request(`/public/tables/${tableCode}/orders`);
    expect(response.status).toBe(200);
    const summaries = (await response.json()) as Array<Record<string, unknown>>;
    expect(summaries).toHaveLength(20);
    expect(summaries[0].createdAt).toBe(new Date(now + 20_000).toISOString());
    expect(summaries.every((summary) => !('notes' in summary))).toBe(true);
  });

  it('applies the ten-per-minute limit to a validated gateway client key', async () => {
    const clientKey = randomBytes(32).toString('hex');
    const results = await Promise.all(
      Array.from({ length: 11 }, () =>
        request(`/public/tables/${tableCode}/orders`, {
          method: 'POST',
          body: { requestId: randomUUID(), items: [] },
          gateway: true,
          clientKey,
        }),
      ),
    );
    expect(results.filter(({ status }) => status === 400)).toHaveLength(10);
    expect(results.filter(({ status }) => status === 429)).toHaveLength(1);
  });

  it('documents public menu and order contracts in OpenAPI', async () => {
    const response = await request('/openapi.json');
    expect(response.status).toBe(200);
    const openApi = (await response.json()) as {
      paths: Record<
        string,
        Record<
          string,
          {
            requestBody?: {
              content?: Record<string, { schema?: { $ref?: string } }>;
            };
            responses?: Record<string, unknown>;
          }
        >
      >;
      components: {
        schemas: Record<
          string,
          { properties?: Record<string, { maxItems?: number }> }
        >;
      };
    };
    expect(openApi.paths).toHaveProperty('/public/tables/{code}/menu');
    expect(openApi.paths).toHaveProperty('/public/tables/{code}/orders');
    expect(
      openApi.paths['/public/tables/{code}/menu'].get.responses,
    ).toHaveProperty('200');
    expect(
      openApi.paths['/public/tables/{code}/orders'].post.requestBody?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/CreatePublicOrderDto');
    expect(
      openApi.components.schemas.CreatePublicOrderDto.properties?.items
        .maxItems,
    ).toBe(50);
    expect(
      openApi.paths['/public/tables/{code}/orders'].post.responses,
    ).toHaveProperty('429');
  });
});
