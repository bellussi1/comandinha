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
  owner: { slug: `tables-owner-${suffix}`, name: 'Tables Owner' },
  admin: { slug: `tables-admin-${suffix}`, name: 'Tables Admin' },
};
const password = 'tables-integration-password';
const accounts = {
  owner: { email: `tables-owner-${suffix}@example.test`, name: 'Tables Owner' },
  admin: { email: `tables-admin-${suffix}@example.test`, name: 'Tables Admin' },
  staff: { email: `tables-staff-${suffix}@example.test`, name: 'Tables Staff' },
};

let app: INestApplication | undefined;
let baseUrl: string;
let restaurantAId: string;
let restaurantBId: string;
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
      'x-comandinha-client-key': 'f'.repeat(64),
    },
    body: JSON.stringify({ email, password, restaurantSlug }),
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { sessionToken: string }).sessionToken;
}

async function createTable(token: string, name: string) {
  const response = await request('/tables', {
    method: 'POST',
    token,
    body: { name },
  });
  return {
    response,
    body: (await response.json().catch(() => ({}))) as Record<string, unknown>,
  };
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

describe('tenant-scoped table management with PostgreSQL', () => {
  it('requires an authenticated session', async () => {
    expect((await request('/tables')).status).toBe(401);
    expect(
      (await request('/tables', { method: 'POST', body: { name: 'Mesa' } }))
        .status,
    ).toBe(401);
  });

  it('lets an owner create, read, rename, deactivate and reactivate a table', async () => {
    const created = await createTable(ownerToken, '  Mesa 01  ');
    expect(created.response.status).toBe(201);
    expect(created.body).toMatchObject({
      restaurantId: restaurantAId,
      name: 'Mesa 01',
      isActive: true,
      activeOrderCount: 0,
    });
    expect(created.body.publicCode).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const tableId = String(created.body.id);
    expect(
      (await request(`/tables/${tableId}`, { token: ownerToken })).status,
    ).toBe(200);
    const list = await request('/tables', { token: ownerToken });
    expect(list.status).toBe(200);
    await expect(list.json()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: tableId })]),
    );

    const renamed = await request(`/tables/${tableId}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { name: 'Mesa Principal' },
    });
    expect(renamed.status).toBe(200);
    await expect(renamed.json()).resolves.toMatchObject({
      name: 'Mesa Principal',
    });

    for (const isActive of [false, true]) {
      const changed = await request(`/tables/${tableId}`, {
        method: 'PATCH',
        token: ownerToken,
        body: { isActive },
      });
      expect(changed.status).toBe(200);
      await expect(changed.json()).resolves.toMatchObject({ isActive });
    }

    expect(
      (
        await request(`/tables/${tableId}`, {
          method: 'DELETE',
          token: ownerToken,
        })
      ).status,
    ).toBe(404);
  });

  it('rejects duplicate names after trimming surrounding whitespace', async () => {
    const first = await createTable(ownerToken, 'Mesa lateral');
    expect(first.response.status).toBe(201);
    const duplicate = await createTable(ownerToken, '  Mesa lateral  ');
    expect(duplicate.response.status).toBe(409);
  });

  it('validates names, rejects empty patches and scopes each list to its restaurant', async () => {
    for (const name of ['', '   ', 'x'.repeat(81)]) {
      expect((await createTable(ownerToken, name)).response.status).toBe(400);
    }
    expect(
      (
        await request('/tables', {
          method: 'POST',
          token: ownerToken,
          body: {},
        })
      ).status,
    ).toBe(400);

    const ownerTable = await createTable(ownerToken, 'Mesa exclusiva A');
    const adminTable = await createTable(adminToken, 'Mesa exclusiva B');
    expect(ownerTable.response.status).toBe(201);
    expect(adminTable.response.status).toBe(201);
    const ownerTableId = String(ownerTable.body.id);
    const adminTableId = String(adminTable.body.id);

    expect(
      (
        await request(`/tables/${ownerTableId}`, {
          method: 'PATCH',
          token: ownerToken,
          body: {},
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(`/tables/${ownerTableId}`, {
          method: 'PATCH',
          token: ownerToken,
          body: { name: '   ' },
        })
      ).status,
    ).toBe(400);

    const ownerList = await request('/tables', { token: ownerToken });
    const adminList = await request('/tables', { token: adminToken });
    const ownerTables = (await ownerList.json()) as Array<{ id: string }>;
    const adminTables = (await adminList.json()) as Array<{ id: string }>;
    expect(ownerTables).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ownerTableId })]),
    );
    expect(ownerTables.some(({ id }) => id === adminTableId)).toBe(false);
    expect(adminTables).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: adminTableId })]),
    );
  });

  it('lets an admin write while staff can only list and read', async () => {
    const adminTable = await createTable(adminToken, 'Mesa administrativa');
    expect(adminTable.response.status).toBe(201);
    expect(adminTable.body.restaurantId).toBe(restaurantBId);
    const adminTableId = String(adminTable.body.id);
    const renamedByAdmin = await request(`/tables/${adminTableId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { name: 'Mesa administrativa renomeada' },
    });
    expect(renamedByAdmin.status).toBe(200);
    await expect(renamedByAdmin.json()).resolves.toMatchObject({
      name: 'Mesa administrativa renomeada',
    });

    expect((await request('/tables', { token: staffToken })).status).toBe(200);
    expect(
      (await request(`/tables/${adminTableId}`, { token: staffToken })).status,
    ).toBe(404);
    const ownerTable = await createTable(ownerToken, 'Mesa para staff');
    expect(ownerTable.response.status).toBe(201);
    const ownerTableId = String(ownerTable.body.id);
    expect(
      (await request(`/tables/${ownerTableId}`, { token: staffToken })).status,
    ).toBe(200);
    expect(
      (await createTable(staffToken, 'Mesa bloqueada')).response.status,
    ).toBe(403);
    expect(
      (
        await request(`/tables/${ownerTableId}`, {
          method: 'PATCH',
          token: staffToken,
          body: { name: 'Staff tentou renomear' },
        })
      ).status,
    ).toBe(403);
  });

  it('allows deactivation when active orders already reference the table', async () => {
    const table = await createTable(ownerToken, 'Mesa com pedido');
    expect(table.response.status).toBe(201);
    await prisma.order.create({
      data: {
        restaurantId: restaurantAId,
        tableId: String(table.body.id),
        totalInCents: 2500,
      },
    });

    const response = await request(`/tables/${String(table.body.id)}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { isActive: false },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      isActive: false,
      activeOrderCount: 1,
    });
  });

  it('hides another restaurant table from reads and updates', async () => {
    const table = await createTable(adminToken, 'Mesa privada');
    expect(table.response.status).toBe(201);
    const tableId = String(table.body.id);

    expect(
      (await request(`/tables/${tableId}`, { token: ownerToken })).status,
    ).toBe(404);
    expect(
      (
        await request(`/tables/${tableId}`, {
          method: 'PATCH',
          token: ownerToken,
          body: { isActive: false },
        })
      ).status,
    ).toBe(404);
  });
});

describe('table dining sessions with PostgreSQL', () => {
  async function createSessionTable(token: string, name: string) {
    const created = await createTable(token, name);
    expect(created.response.status).toBe(201);
    return created.body;
  }

  async function openSession(tableId: string, token = ownerToken) {
    return request(`/tables/${tableId}/session`, { method: 'POST', token });
  }

  async function closeSession(sessionId: string, token = ownerToken) {
    return request(`/sessions/${sessionId}/close`, { method: 'POST', token });
  }

  it('opens idempotently, lists the current summary and lets staff read the session', async () => {
    const table = await createSessionTable(ownerToken, 'Sessão para consulta');
    const first = await openSession(String(table.id));
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as Record<string, unknown>;
    expect(firstBody).toMatchObject({
      restaurantId: restaurantAId,
      tableId: table.id,
      status: 'OPEN',
      projectedTotalInCents: 0,
      nonTerminalOrderCount: 0,
    });

    const retried = await openSession(String(table.id));
    expect(retried.status).toBe(200);
    await expect(retried.json()).resolves.toMatchObject({ id: firstBody.id });

    const read = await request(`/tables/${String(table.id)}/session`, {
      token: staffToken,
    });
    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toMatchObject({
      session: { id: firstBody.id, status: 'OPEN', orders: [] },
    });

    const tables = await request('/tables', { token: ownerToken });
    const listed = (await tables.json()) as Array<Record<string, unknown>>;
    expect(listed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: table.id,
          currentSession: expect.objectContaining({
            id: firstBody.id,
            projectedTotalInCents: 0,
            nonTerminalOrderCount: 0,
          }),
        }),
      ]),
    );
  });

  it('blocks closure until active orders are terminal and saves only delivered totals', async () => {
    const table = await createSessionTable(ownerToken, 'Sessão com pedidos');
    const opened = await openSession(String(table.id));
    const session = (await opened.json()) as { id: string };

    for (const status of [
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
      OrderStatus.READY,
    ]) {
      await prisma.order.create({
        data: {
          restaurantId: restaurantAId,
          tableId: String(table.id),
          diningSessionId: session.id,
          status,
          totalInCents: 900,
        },
      });
      expect((await closeSession(session.id)).status).toBe(409);
      await prisma.order.updateMany({
        where: { tableId: String(table.id), diningSessionId: session.id },
        data: { status: OrderStatus.CANCELLED },
      });
    }

    await prisma.order.createMany({
      data: [
        {
          restaurantId: restaurantAId,
          tableId: String(table.id),
          diningSessionId: session.id,
          status: OrderStatus.DELIVERED,
          totalInCents: 1_200,
        },
        {
          restaurantId: restaurantAId,
          tableId: String(table.id),
          diningSessionId: session.id,
          status: OrderStatus.CANCELLED,
          totalInCents: 700,
        },
      ],
    });

    const closed = await closeSession(session.id);
    expect(closed.status).toBe(200);
    await expect(closed.json()).resolves.toMatchObject({
      id: session.id,
      status: 'CLOSED',
      closedTotalInCents: 1_200,
      closedAt: expect.any(String),
    });

    const retried = await closeSession(session.id);
    expect(retried.status).toBe(200);
    await expect(retried.json()).resolves.toMatchObject({
      id: session.id,
      closedTotalInCents: 1_200,
    });

    const reopened = await openSession(String(table.id));
    expect(reopened.status).toBe(201);
    const reopenedSession = (await reopened.json()) as Record<string, unknown>;
    expect(reopenedSession).toMatchObject({
      status: 'OPEN',
      projectedTotalInCents: 0,
    });
    expect(reopenedSession.id).not.toBe(session.id);
  });

  it('closes an empty session at zero and keeps an inactive table unavailable', async () => {
    const table = await createSessionTable(ownerToken, 'Sessão vazia');
    const opened = await openSession(String(table.id));
    const session = (await opened.json()) as { id: string };
    const closed = await closeSession(session.id);
    expect(closed.status).toBe(200);
    await expect(closed.json()).resolves.toMatchObject({
      closedTotalInCents: 0,
      status: 'CLOSED',
    });

    const inactive = await createSessionTable(ownerToken, 'Mesa inativa');
    const update = await request(`/tables/${String(inactive.id)}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { isActive: false },
    });
    expect(update.status).toBe(200);
    expect((await openSession(String(inactive.id))).status).toBe(409);
  });

  it('restricts writes by role, hides other restaurants and prevents deactivation while open', async () => {
    const ownerTable = await createSessionTable(ownerToken, 'Mesa do owner');
    const ownerOpen = await openSession(String(ownerTable.id), staffToken);
    expect(ownerOpen.status).toBe(403);
    const openedOwner = await openSession(String(ownerTable.id));
    const ownerSession = (await openedOwner.json()) as { id: string };
    expect(openedOwner.status).toBe(201);

    expect((await closeSession(ownerSession.id, staffToken)).status).toBe(403);
    const deactivate = await request(`/tables/${String(ownerTable.id)}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { isActive: false },
    });
    expect(deactivate.status).toBe(409);

    const adminTable = await createSessionTable(adminToken, 'Mesa do admin');
    const openedAdmin = await openSession(String(adminTable.id), adminToken);
    expect(openedAdmin.status).toBe(201);
    const adminSession = (await openedAdmin.json()) as { id: string };
    expect(
      (
        await request(`/tables/${String(adminTable.id)}/session`, {
          token: ownerToken,
        })
      ).status,
    ).toBe(404);
    expect((await closeSession(adminSession.id, ownerToken)).status).toBe(404);
  });

  it('serializes concurrent opens and leaves only one open session for a table', async () => {
    const table = await createSessionTable(ownerToken, 'Mesa concorrente');
    const responses = await Promise.all([
      openSession(String(table.id)),
      openSession(String(table.id)),
    ]);
    expect(
      responses.map(({ status }) => status).sort((left, right) => left - right),
    ).toEqual([200, 201]);
    const sessions = await Promise.all(
      responses.map((response) => response.json() as Promise<{ id: string }>),
    );
    expect(sessions[0]?.id).toBe(sessions[1]?.id);
    expect(
      await prisma.diningSession.count({
        where: { tableId: String(table.id), status: 'OPEN' },
      }),
    ).toBe(1);
  });
});
