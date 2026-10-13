import { randomBytes, randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/auth/password-hasher.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { OrderStatus } from '../src/generated/prisma/client.js';
import { configureOpenApi } from '../src/openapi.js';
import { AppModule } from '../src/app.module.js';

const prisma = new PrismaService();
const gatewaySecret = randomBytes(32).toString('base64url');
const suffix = randomUUID();
const restaurants = {
  owner: { slug: `orders-owner-${suffix}`, name: 'Orders Owner' },
  admin: { slug: `orders-admin-${suffix}`, name: 'Orders Admin' },
};
const accounts = {
  owner: { email: `orders-owner-${suffix}@example.test`, name: 'Orders Owner' },
  admin: { email: `orders-admin-${suffix}@example.test`, name: 'Orders Admin' },
  staff: { email: `orders-staff-${suffix}@example.test`, name: 'Orders Staff' },
};
const password = 'orders-integration-password';
const statuses = Object.values(OrderStatus);

let app: INestApplication | undefined;
let baseUrl: string;
let restaurantAId: string;
let restaurantBId: string;
let tableAId: string;
let tableBId: string;
let productAId: string;
let ownerToken: string;
let adminToken: string;
let staffToken: string;

async function request(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: options.method ?? 'GET',
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body !== undefined
        ? { 'content-type': 'application/json' }
        : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
}

async function login(email: string, restaurantSlug: string): Promise<string> {
  const response = await fetch(new URL('/auth/sessions', baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-comandinha-gateway-secret': gatewaySecret,
      'x-comandinha-client-key': 'd'.repeat(64),
    },
    body: JSON.stringify({ email, password, restaurantSlug }),
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { sessionToken: string }).sessionToken;
}

async function createOrder(
  status: OrderStatus,
  restaurantId = restaurantAId,
  tableId = tableAId,
) {
  return prisma.order.create({
    data: { restaurantId, tableId, status, totalInCents: 1200 },
  });
}

async function patchStatus(
  id: string,
  status: OrderStatus,
  token: string,
): Promise<Response> {
  return request(`/orders/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

beforeAll(async () => {
  process.env.AUTH_GATEWAY_SECRET = gatewaySecret;
  await prisma.$connect();
  const passwordHash = await hashPassword(password);
  const [ownerRestaurant, adminRestaurant] = await Promise.all([
    prisma.restaurant.create({ data: restaurants.owner }),
    prisma.restaurant.create({ data: restaurants.admin }),
  ]);
  restaurantAId = ownerRestaurant.id;
  restaurantBId = adminRestaurant.id;

  const [owner, admin, staff] = await Promise.all([
    prisma.user.create({ data: { ...accounts.owner, passwordHash } }),
    prisma.user.create({ data: { ...accounts.admin, passwordHash } }),
    prisma.user.create({ data: { ...accounts.staff, passwordHash } }),
  ]);
  await prisma.membership.createMany({
    data: [
      { userId: owner.id, restaurantId: restaurantAId, role: 'OWNER' },
      { userId: admin.id, restaurantId: restaurantBId, role: 'ADMIN' },
      { userId: staff.id, restaurantId: restaurantAId, role: 'STAFF' },
    ],
  });

  const [tableA, tableB] = await Promise.all([
    prisma.restaurantTable.create({
      data: {
        restaurantId: restaurantAId,
        name: 'Orders Table A',
        publicCode: randomBytes(32).toString('base64url'),
      },
    }),
    prisma.restaurantTable.create({
      data: {
        restaurantId: restaurantBId,
        name: 'Orders Table B',
        publicCode: randomBytes(32).toString('base64url'),
      },
    }),
  ]);
  tableAId = tableA.id;
  tableBId = tableB.id;
  const category = await prisma.catalogCategory.create({
    data: {
      restaurantId: restaurantAId,
      name: 'Order snapshots',
      nameNormalized: 'order-snapshots',
    },
  });
  const product = await prisma.catalogProduct.create({
    data: {
      restaurantId: restaurantAId,
      categoryId: category.id,
      name: 'Snapshot product',
      priceInCents: 1200,
    },
  });
  productAId = product.id;

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
  ownerToken = await login(accounts.owner.email, restaurants.owner.slug);
  adminToken = await login(accounts.admin.email, restaurants.admin.slug);
  staffToken = await login(accounts.staff.email, restaurants.owner.slug);
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
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [accounts.owner.email, accounts.admin.email, accounts.staff.email],
      },
    },
  });
  await prisma.$disconnect();
  delete process.env.AUTH_GATEWAY_SECRET;
});

describe('tenant-scoped order queue with PostgreSQL', () => {
  it('requires a session and hides order IDs from another restaurant', async () => {
    const ownerOrder = await createOrder(OrderStatus.PENDING);
    const adminOrder = await createOrder(
      OrderStatus.READY,
      restaurantBId,
      tableBId,
    );

    expect((await request('/orders')).status).toBe(401);
    expect(
      (await request(`/orders/${ownerOrder.id}`, { token: adminToken })).status,
    ).toBe(404);
    expect(
      (await request(`/orders/${adminOrder.id}`, { token: ownerToken })).status,
    ).toBe(404);

    const ownerList = (await request('/orders', { token: ownerToken }).then(
      (res) => res.json(),
    )) as Array<{ id: string }>;
    const adminList = (await request('/orders', { token: adminToken }).then(
      (res) => res.json(),
    )) as Array<{ id: string }>;
    expect(ownerList.some(({ id }) => id === adminOrder.id)).toBe(false);
    expect(adminList.some(({ id }) => id === ownerOrder.id)).toBe(false);
  });

  it('filters by status and returns the table name and item snapshots newest first', async () => {
    const older = await createOrder(OrderStatus.PENDING);
    await prisma.orderItem.create({
      data: {
        restaurantId: restaurantAId,
        orderId: older.id,
        productId: productAId,
        nameSnapshot: 'Name at order time',
        unitPriceInCents: 1200,
        quantity: 1,
        lineTotalInCents: 1200,
      },
    });
    const newer = await createOrder(OrderStatus.PENDING);
    await prisma.order.update({
      where: { id: newer.id },
      data: { createdAt: new Date(Date.now() + 60_000) },
    });
    await prisma.order.update({
      where: { id: older.id },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });

    const list = await request('/orders?status=PENDING', { token: staffToken });
    expect(list.status).toBe(200);
    const orders = (await list.json()) as Array<{
      id: string;
      table: { name: string };
      items: Array<{ nameSnapshot: string; unitPriceInCents: number }>;
    }>;
    expect(orders[0].id).toBe(newer.id);
    expect(orders.find(({ id }) => id === older.id)).toMatchObject({
      table: { name: 'Orders Table A' },
      items: [{ nameSnapshot: 'Name at order time', unitPriceInCents: 1200 }],
    });
    expect(
      orders.find(({ id }) => id === older.id)?.items[0],
    ).not.toHaveProperty('productId');
    expect(orders.some(({ id }) => id === older.id)).toBe(true);
  });

  it('returns exact status counts scoped to the authenticated restaurant', async () => {
    const before = (await request('/orders/summary', {
      token: ownerToken,
    }).then((res) => res.json())) as Record<OrderStatus, number>;
    await Promise.all(statuses.map((status) => createOrder(status)));
    const response = await request('/orders/summary', { token: ownerToken });
    expect(response.status).toBe(200);
    const after = (await response.json()) as Record<OrderStatus, number>;
    for (const status of statuses)
      expect(after[status]).toBe(before[status] + 1);
    expect(
      await request('/orders/summary', { token: adminToken }).then((res) =>
        res.json(),
      ),
    ).toMatchObject({
      PENDING: 0,
      PREPARING: 0,
      READY: 1,
      DELIVERED: 0,
      CANCELLED: 0,
    });
  });

  it('allows owner, admin and staff to advance orders in their restaurant', async () => {
    const cases = [
      [ownerToken, restaurantAId, tableAId],
      [adminToken, restaurantBId, tableBId],
      [staffToken, restaurantAId, tableAId],
    ] as const;
    for (const [token, restaurantId, tableId] of cases) {
      const order = await createOrder(
        OrderStatus.PENDING,
        restaurantId,
        tableId,
      );
      const response = await patchStatus(
        order.id,
        OrderStatus.PREPARING,
        token,
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        id: order.id,
        status: OrderStatus.PREPARING,
      });
    }
  });

  it('persists every permitted transition and rejects every other pair', async () => {
    const allowed: Array<[OrderStatus, OrderStatus]> = [
      [OrderStatus.PENDING, OrderStatus.PREPARING],
      [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING, OrderStatus.READY],
      [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.READY, OrderStatus.DELIVERED],
    ];
    for (const [current, next] of allowed) {
      const order = await createOrder(current);
      const response = await patchStatus(order.id, next, staffToken);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        id: order.id,
        status: next,
      });
    }

    for (const current of statuses) {
      const order = await createOrder(current);
      for (const next of statuses.filter(
        (candidate) =>
          !allowed.some(([from, to]) => from === current && to === candidate),
      )) {
        const response = await patchStatus(order.id, next, staffToken);
        expect(response.status).toBe(409);
        const persisted = await prisma.order.findUniqueOrThrow({
          where: { id: order.id },
        });
        expect(persisted.status).toBe(current);
      }
    }
  });

  it('allows only one concurrent status update to win', async () => {
    const order = await createOrder(OrderStatus.PENDING);
    const responses = await Promise.all([
      patchStatus(order.id, OrderStatus.PREPARING, ownerToken),
      patchStatus(order.id, OrderStatus.CANCELLED, staffToken),
    ]);
    expect(
      responses.map(({ status }) => status).sort((left, right) => left - right),
    ).toEqual([200, 409]);
    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect([OrderStatus.PREPARING, OrderStatus.CANCELLED]).toContain(
      persisted.status,
    );
  });
});
