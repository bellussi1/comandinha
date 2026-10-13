import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseSeedConfig } from '../prisma/seed-config.js';
import { seedOwner } from '../prisma/seed-owner.js';
import { PrismaService } from '../src/database/prisma.service.js';

const prisma = new PrismaService();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('identity schema with PostgreSQL', () => {
  it('creates users, memberships, and revocable admin sessions', async () => {
    const result = await prisma.$queryRaw<
      Array<{
        userTable: string | null;
        membershipTable: string | null;
        sessionTable: string | null;
      }>
    >`
      SELECT
        to_regclass('public."User"')::text AS "userTable",
        to_regclass('public."Membership"')::text AS "membershipTable",
        to_regclass('public."AdminSession"')::text AS "sessionTable"
    `;

    expect(result[0]).toEqual({
      userTable: '"User"',
      membershipTable: '"Membership"',
      sessionTable: '"AdminSession"',
    });
  });

  it('enforces unique user emails, memberships, and hashed session secrets', async () => {
    const restaurantId = randomUUID();
    const userId = randomUUID();
    const membershipId = randomUUID();
    const sessionId = randomUUID();
    const createdAt = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO "Restaurant" ("id", "name", "slug", "createdAt", "updatedAt")
         VALUES (${restaurantId}::uuid, ${'Schema Test Restaurant'}, ${`schema-${restaurantId}`}, ${createdAt}, ${createdAt})
      `;
      await transaction.$executeRaw`
        INSERT INTO "User" ("id", "name", "email", "passwordHash", "isActive", "createdAt", "updatedAt")
         VALUES (${userId}::uuid, ${'Schema Test Owner'}, ${`schema-${userId}@example.test`}, ${'scrypt-test-hash'}, TRUE, ${createdAt}, ${createdAt})
      `;
      await transaction.$executeRaw`
        INSERT INTO "Membership" ("id", "userId", "restaurantId", "role", "isActive", "createdAt", "updatedAt")
         VALUES (${membershipId}::uuid, ${userId}::uuid, ${restaurantId}::uuid, 'OWNER', TRUE, ${createdAt}, ${createdAt})
      `;
      await transaction.$executeRaw`
        INSERT INTO "AdminSession" ("id", "tokenHash", "membershipId", "expiresAt", "createdAt")
         VALUES (${sessionId}::uuid, ${`hash-${sessionId}`}, ${membershipId}::uuid, ${new Date(Date.now() + 60_000)}, ${createdAt})
      `;

      const expectUniqueViolation = async (query: () => Promise<unknown>) => {
        await transaction.$executeRawUnsafe('SAVEPOINT constraint_check');
        await expect(query()).rejects.toMatchObject({
          meta: { driverAdapterError: { cause: { originalCode: '23505' } } },
        });
        await transaction.$executeRawUnsafe(
          'ROLLBACK TO SAVEPOINT constraint_check',
        );
        await transaction.$executeRawUnsafe(
          'RELEASE SAVEPOINT constraint_check',
        );
      };

      await expectUniqueViolation(
        () =>
          transaction.$executeRaw`
          INSERT INTO "User" ("id", "name", "email", "passwordHash", "isActive", "createdAt", "updatedAt")
          VALUES (${randomUUID()}::uuid, ${'Duplicate Email'}, ${`schema-${userId}@example.test`}, ${'scrypt-test-hash'}, TRUE, ${createdAt}, ${createdAt})
        `,
      );

      await expectUniqueViolation(
        () =>
          transaction.$executeRaw`
          INSERT INTO "Membership" ("id", "userId", "restaurantId", "role", "isActive", "createdAt", "updatedAt")
          VALUES (${randomUUID()}::uuid, ${userId}::uuid, ${restaurantId}::uuid, 'ADMIN', TRUE, ${createdAt}, ${createdAt})
        `,
      );

      await expectUniqueViolation(
        () =>
          transaction.$executeRaw`
          INSERT INTO "AdminSession" ("id", "tokenHash", "membershipId", "expiresAt", "createdAt")
          VALUES (${randomUUID()}::uuid, ${`hash-${sessionId}`}, ${membershipId}::uuid, ${new Date(Date.now() + 60_000)}, ${createdAt})
        `,
      );
    });
  });

  it('seeds the owner, restaurant, and membership without duplicates', async () => {
    const suffix = randomUUID();
    const slug = `seed-${suffix}`;
    const email = `seed-${suffix}@example.test`;
    const config = parseSeedConfig({
      NODE_ENV: 'test',
      ALLOW_LOCAL_DEMO_SEED: 'true',
      DATABASE_URL: process.env.DATABASE_URL,
      DEMO_OWNER_NAME: 'Seed Integration Owner',
      DEMO_OWNER_EMAIL: email,
      DEMO_OWNER_PASSWORD: 'a-long-local-password',
      DEMO_RESTAURANT_NAME: 'Seed Integration Restaurant',
      DEMO_RESTAURANT_SLUG: slug,
    });

    try {
      await seedOwner(prisma, config);
      await seedOwner(prisma, config);

      const counts = await prisma.$queryRaw<
        Array<{
          users: string;
          restaurants: string;
          memberships: string;
        }>
      >`
        SELECT
          (SELECT count(*) FROM "User" WHERE "email" = ${email})::text AS users,
          (SELECT count(*) FROM "Restaurant" WHERE "slug" = ${slug})::text AS restaurants,
          (SELECT count(*) FROM "Membership" m
           JOIN "User" u ON u."id" = m."userId"
           JOIN "Restaurant" r ON r."id" = m."restaurantId"
           WHERE u."email" = ${email} AND r."slug" = ${slug})::text AS memberships
      `;

      expect(counts[0]).toEqual({
        users: '1',
        restaurants: '1',
        memberships: '1',
      });
    } finally {
      await prisma.$executeRaw`DELETE FROM "Restaurant" WHERE "slug" = ${slug}`;
      await prisma.$executeRaw`DELETE FROM "User" WHERE "email" = ${email}`;
    }
  });
});
