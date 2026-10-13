import { randomBytes, randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseSeedConfig } from '../prisma/seed-config.js';
import { seedOwner } from '../prisma/seed-owner.js';
import { configureOpenApi } from '../src/openapi.js';
import { AppModule } from '../src/app.module.js';
import { hashSessionToken, createSessionToken } from '../src/auth/session-token.js';
import { PrismaService } from '../src/database/prisma.service.js';

const prisma = new PrismaService();
const gatewaySecret = randomBytes(32).toString('base64url');
const suffix = randomUUID();
const restaurantSlug = `auth-${suffix}`;
const ownerEmail = `auth-${suffix}@example.test`;
const ownerPassword = 'integration-password-12';
const legacyPasswordHash =
  'scrypt$1$16384$8$1$BwcHBwcHBwcHBwcHBwcHBw$2b3JP2QhHr4TZlndLNLMJDlZcavXktSjq7f3-SHHiGhbP8qTVNAG2Tg1Vtu6aePthB2bzgcS4jczOXYPzcfMpw';
const secondRestaurantSlug = `auth-second-${suffix}`;
const seedConfig = parseSeedConfig({
  NODE_ENV: 'test',
  ALLOW_LOCAL_DEMO_SEED: 'true',
  DATABASE_URL: process.env.DATABASE_URL,
  DEMO_OWNER_NAME: 'Auth Integration Owner',
  DEMO_OWNER_EMAIL: ownerEmail,
  DEMO_OWNER_PASSWORD: ownerPassword,
  DEMO_RESTAURANT_NAME: 'Auth Integration Restaurant',
  DEMO_RESTAURANT_SLUG: restaurantSlug,
});

let app: INestApplication | undefined;
let baseUrl: string;
let primarySessionToken: string;

function headers(options: { includeGateway?: boolean; token?: string; clientKey?: string } = {}) {
  return {
    ...(options.includeGateway ? { 'x-comandinha-gateway-secret': gatewaySecret } : {}),
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...(options.clientKey ? { 'x-comandinha-client-key': options.clientKey } : {}),
  };
}

async function postSession(
  credentials: { email: string; password: string; restaurantSlug?: string },
  includeGateway = true,
  clientKey?: string,
) {
  const response = await fetch(new URL('/auth/sessions', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers({ includeGateway, clientKey }) },
    body: JSON.stringify(credentials),
  });
  return response;
}

beforeAll(async () => {
  process.env.AUTH_GATEWAY_SECRET = gatewaySecret;
  await prisma.$connect();

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
  await seedOwner(prisma, seedConfig);
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  await prisma.$executeRaw`DELETE FROM "Restaurant" WHERE "slug" = ${secondRestaurantSlug}`;
  await prisma.$executeRaw`DELETE FROM "Restaurant" WHERE "slug" = ${restaurantSlug}`;
  await prisma.$executeRaw`DELETE FROM "User" WHERE "email" = ${ownerEmail}`;
  await prisma.$disconnect();
  delete process.env.AUTH_GATEWAY_SECRET;
});

describe('admin authentication with PostgreSQL', () => {
  it('rejects browser requests that do not carry the server-only gateway secret', async () => {
    const response = await postSession({ email: ownerEmail, password: ownerPassword }, false);

    expect(response.status).toBe(401);
  });

  it('uses the same generic response for an unknown user and a wrong password', async () => {
    const wrongPassword = await postSession({ email: ownerEmail, password: 'wrong-password' });
    const unknownEmail = await postSession({
      email: 'unknown-user@example.test',
      password: 'wrong-password',
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    await expect(wrongPassword.json()).resolves.toEqual(await unknownEmail.json());
  });

  it('upgrades a legacy password hash after a successful login', async () => {
    const legacyEmail = `legacy-${suffix}@example.test`;
    const restaurant = await prisma.restaurant.findUniqueOrThrow({
      where: { slug: restaurantSlug },
    });
    await prisma.user.create({
      data: {
        name: 'Legacy Auth Owner',
        email: legacyEmail,
        passwordHash: legacyPasswordHash,
        memberships: { create: { restaurantId: restaurant.id, role: 'ADMIN' } },
      },
    });

    try {
      const response = await postSession({
        email: legacyEmail,
        password: 'legacy-password-12',
      });
      expect(response.status).toBe(201);

      const upgradedUser = await prisma.user.findUniqueOrThrow({
        where: { email: legacyEmail },
      });
      expect(upgradedUser.passwordHash).toMatch(
        /^scrypt\$2\$131072\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/,
      );
    } finally {
      await prisma.user.delete({ where: { email: legacyEmail } });
    }
  });

  it('creates an opaque session and derives tenant context from its membership', async () => {
    const response = await postSession({ email: ownerEmail, password: ownerPassword });
    expect(response.status).toBe(201);

    const session = await response.json();
    expect(session).toMatchObject({
      sessionToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expiresAt: expect.any(String),
      user: { email: ownerEmail },
      restaurant: { slug: restaurantSlug },
      membership: { role: 'OWNER' },
    });
    expect(session).not.toHaveProperty('passwordHash');
    expect(session).not.toHaveProperty('tokenHash');
    primarySessionToken = session.sessionToken;

    const storedSession = await prisma.adminSession.findUnique({
      where: { tokenHash: hashSessionToken(primarySessionToken) },
    });
    expect(storedSession).not.toBeNull();
    expect(storedSession?.tokenHash).not.toBe(primarySessionToken);

    const currentResponse = await fetch(new URL('/auth/sessions/current', baseUrl), {
      headers: {
        ...headers({ includeGateway: true, token: session.sessionToken }),
        'x-restaurant-id': 'forged-restaurant-id',
      },
    });

    expect(currentResponse.status).toBe(200);
    const current = await currentResponse.json();
    expect(current.restaurant.slug).toBe(restaurantSlug);
    expect(current).not.toHaveProperty('sessionToken');
    expect(current).not.toHaveProperty('passwordHash');
  });

  it('rejects session inspection without an opaque session secret', async () => {
    const response = await fetch(new URL('/auth/sessions/current', baseUrl), {
      headers: headers({ includeGateway: true }),
    });

    expect(response.status).toBe(401);
  });

  it('requires restaurant selection after credentials are verified for multiple memberships', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    const secondRestaurant = await prisma.restaurant.create({
      data: { name: 'Second Auth Restaurant', slug: secondRestaurantSlug },
    });
    await prisma.membership.create({
      data: { userId: user.id, restaurantId: secondRestaurant.id, role: 'ADMIN' },
    });

    const selectionRequired = await postSession({ email: ownerEmail, password: ownerPassword });
    expect(selectionRequired.status).toBe(409);
    await expect(selectionRequired.json()).resolves.toMatchObject({
      code: 'RESTAURANT_SELECTION_REQUIRED',
      memberships: expect.arrayContaining([
        expect.objectContaining({
          restaurant: expect.objectContaining({ slug: secondRestaurantSlug }),
        }),
      ]),
    });

    const selected = await postSession({
      email: ownerEmail,
      password: ownerPassword,
      restaurantSlug: secondRestaurantSlug,
    });
    expect(selected.status).toBe(201);
    await expect(selected.json()).resolves.toMatchObject({
      restaurant: { slug: secondRestaurantSlug },
      membership: { role: 'ADMIN' },
    });
  });

  it('rejects expired and inactive-membership sessions', async () => {
    const membership = await prisma.membership.findFirstOrThrow({
      where: { restaurant: { slug: restaurantSlug }, user: { email: ownerEmail } },
    });
    const expiredToken = createSessionToken();
    await prisma.adminSession.create({
      data: {
        tokenHash: hashSessionToken(expiredToken),
        membershipId: membership.id,
        expiresAt: new Date(Date.now() - 1_000),
      },
    });

    const expiredResponse = await fetch(new URL('/auth/sessions/current', baseUrl), {
      headers: headers({ includeGateway: true, token: expiredToken }),
    });
    expect(expiredResponse.status).toBe(401);

    await prisma.membership.update({ where: { id: membership.id }, data: { isActive: false } });
    try {
      const inactiveMembershipResponse = await fetch(
        new URL('/auth/sessions/current', baseUrl),
        { headers: headers({ includeGateway: true, token: primarySessionToken }) },
      );
      expect(inactiveMembershipResponse.status).toBe(401);
    } finally {
      await prisma.membership.update({ where: { id: membership.id }, data: { isActive: true } });
    }
  });

  it('revokes the current session persistently', async () => {
    const revokeResponse = await fetch(new URL('/auth/sessions/current', baseUrl), {
      method: 'DELETE',
      headers: headers({ includeGateway: true, token: primarySessionToken }),
    });
    expect(revokeResponse.status).toBe(204);

    const currentResponse = await fetch(new URL('/auth/sessions/current', baseUrl), {
      headers: headers({ includeGateway: true, token: primarySessionToken }),
    });
    expect(currentResponse.status).toBe(401);
  });

  it('limits guesses per account and source without blocking that account from another source', async () => {
    const limitedEmail = `limited-${suffix}@example.test`;
    const firstSourceKey = 'a'.repeat(64);
    const secondSourceKey = 'b'.repeat(64);
    // Guards run before DTO validation, so this exercises the limiter without concurrent DB work.
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () =>
        postSession({ email: limitedEmail, password: '' }, true, firstSourceKey),
      ),
    );
    const unrelatedAccount = await postSession({
      email: `unrelated-${suffix}@example.test`,
      password: '',
    }, true, firstSourceKey);
    const sameAccountFromAnotherSource = await postSession({
      email: limitedEmail,
      password: '',
    }, true, secondSourceKey);

    expect(attempts.filter(({ status }) => status === 400)).toHaveLength(5);
    const throttledAttempts = attempts.filter(({ status }) => status === 429);
    expect(throttledAttempts).toHaveLength(1);
    await expect(throttledAttempts[0].json()).resolves.toEqual({
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    });
    expect(unrelatedAccount.status).toBe(400);
    expect(sameAccountFromAnotherSource.status).toBe(400);
  });

  it('limits aggregate login work from one source across different account names', async () => {
    const sourceKey = 'c'.repeat(64);
    // Guards run before DTO validation, so this exercises the limiter without concurrent DB work.
    const attempts = await Promise.all(
      Array.from({ length: 21 }, (_, index) =>
        postSession({
          email: `source-attempt-${index}-${suffix}@example.test`,
          password: '',
        }, true, sourceKey),
      ),
    );
    const otherSource = await postSession({
      email: `other-source-${suffix}@example.test`,
      password: '',
    }, true, 'd'.repeat(64));

    expect(attempts.filter(({ status }) => status === 400)).toHaveLength(20);
    expect(attempts.filter(({ status }) => status === 429)).toHaveLength(1);
    expect(otherSource.status).toBe(400);
  });

  it('publishes the session routes and bearer contract through OpenAPI', async () => {
    const response = await fetch(new URL('/openapi.json', baseUrl));
    expect(response.status).toBe(200);
    const openApi = await response.json();

    expect(openApi.paths).toHaveProperty('/auth/sessions');
    expect(openApi.paths).toHaveProperty('/auth/sessions/current');
    expect(openApi.components.securitySchemes['admin-session']).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(openApi.paths['/auth/sessions'].post.responses['429']).toBeDefined();
    expect(openApi.paths['/auth/sessions'].post.responses['429'].content['application/json'].schema)
      .toEqual({ $ref: '#/components/schemas/TooManyRequestsDto' });
    expect(openApi.paths['/auth/sessions'].post.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'x-comandinha-client-key',
          in: 'header',
          required: false,
        }),
      ]),
    );
    expect(openApi.components.schemas.TooManyRequestsDto.properties).toEqual({
      statusCode: { type: 'number', example: 429 },
      message: { type: 'string', example: 'ThrottlerException: Too Many Requests' },
    });
    expect(openApi.components.schemas.CreateSessionRequestDto.properties.email.format).toBe('email');
    expect(openApi.components.schemas.CreateSessionRequestDto.properties.restaurantSlug.pattern)
      .toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$');
  });
});
