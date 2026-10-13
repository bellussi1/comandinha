import { randomBytes, randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/auth/password-hasher.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { configureOpenApi } from '../src/openapi.js';
import { AppModule } from '../src/app.module.js';

const prisma = new PrismaService();
const gatewaySecret = randomBytes(32).toString('base64url');
const suffix = randomUUID();
const restaurantA = {
  slug: `catalog-a-${suffix}`,
  name: 'Catalog Restaurant A',
};
const restaurantB = {
  slug: `catalog-b-${suffix}`,
  name: 'Catalog Restaurant B',
};
const password = 'catalog-integration-password';
const accounts = {
  owner: {
    email: `catalog-owner-${suffix}@example.test`,
    name: 'Catalog Owner',
  },
  admin: {
    email: `catalog-admin-${suffix}@example.test`,
    name: 'Catalog Admin',
  },
  staff: {
    email: `catalog-staff-${suffix}@example.test`,
    name: 'Catalog Staff',
  },
};

let app: INestApplication | undefined;
let baseUrl: string;
let ownerToken: string;
let adminToken: string;
let staffToken: string;

async function request(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
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
      'x-comandinha-client-key': 'e'.repeat(64),
    },
    body: JSON.stringify({ email, password, restaurantSlug }),
  });

  expect(response.status).toBe(201);
  const session = (await response.json()) as { sessionToken: string };
  expect(session.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  return session.sessionToken;
}

async function createCategory(token: string, name: string) {
  const response = await request('/catalog/categories', {
    method: 'POST',
    token,
    body: { name },
  });
  return {
    response,
    body: (await response.json().catch(() => ({}))) as Record<string, unknown>,
  };
}

async function createProduct(
  token: string,
  categoryId: string,
  name = 'Produto teste',
) {
  const response = await request('/catalog/products', {
    method: 'POST',
    token,
    body: { name, categoryId, priceInCents: 1290 },
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

  const firstRestaurant = await prisma.restaurant.create({ data: restaurantA });
  const secondRestaurant = await prisma.restaurant.create({
    data: restaurantB,
  });
  const [owner, admin, staff] = await Promise.all([
    prisma.user.create({
      data: { ...accounts.owner, passwordHash },
    }),
    prisma.user.create({
      data: { ...accounts.admin, passwordHash },
    }),
    prisma.user.create({
      data: { ...accounts.staff, passwordHash },
    }),
  ]);
  await prisma.membership.createMany({
    data: [
      { userId: owner.id, restaurantId: firstRestaurant.id, role: 'OWNER' },
      { userId: admin.id, restaurantId: secondRestaurant.id, role: 'ADMIN' },
      { userId: staff.id, restaurantId: firstRestaurant.id, role: 'STAFF' },
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

  ownerToken = await login(accounts.owner.email, restaurantA.slug);
  adminToken = await login(accounts.admin.email, restaurantB.slug);
  staffToken = await login(accounts.staff.email, restaurantA.slug);
});

afterAll(async () => {
  if (app) await app.close();
  await prisma.$executeRaw`DELETE FROM "Restaurant" WHERE "slug" IN (${restaurantA.slug}, ${restaurantB.slug})`;
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

describe('tenant-scoped catalog with PostgreSQL', () => {
  it('publishes request bodies, route IDs, and product query filters in OpenAPI', async () => {
    const response = await request('/openapi.json');
    expect(response.status).toBe(200);

    type Operation = {
      requestBody?: {
        content?: Record<string, { schema?: { $ref?: string } }>;
      };
      parameters?: Array<{
        name: string;
        in: string;
        required?: boolean;
        schema?: { type?: string; format?: string };
      }>;
      responses?: Record<string, unknown>;
    };
    const openApi = (await response.json()) as {
      paths: Record<string, Record<string, Operation>>;
      components: {
        schemas: Record<
          string,
          {
            properties?: Record<
              string,
              { maximum?: number; nullable?: boolean }
            >;
          required?: string[];
          }
        >;
      };
    };

    expect(
      openApi.paths['/catalog/categories'].post.requestBody?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/CreateCatalogCategoryDto');
    expect(
      openApi.paths['/catalog/products'].post.requestBody?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/CreateCatalogProductDto');
    expect(
      openApi.components.schemas.CreateCatalogProductDto.properties
        ?.priceInCents.maximum,
    ).toBe(2_147_483_647);
    expect(
      openApi.components.schemas.UpdateCatalogProductDto.properties
        ?.priceInCents.maximum,
    ).toBe(2_147_483_647);
    expect(
      openApi.components.schemas.CreateCatalogCategoryDto.properties
        ?.displayOrder.maximum,
    ).toBe(2_147_483_647);
    expect(
      openApi.components.schemas.UpdateCatalogCategoryDto.properties
        ?.displayOrder.maximum,
    ).toBe(2_147_483_647);
    expect(
      openApi.components.schemas.UpdateCatalogCategoryDto.properties
        ?.description.nullable,
    ).toBe(true);
    expect(
      openApi.components.schemas.CreateCatalogProductDto.properties
        ?.description.nullable,
    ).toBeUndefined();
    expect(openApi.components.schemas.CreateCatalogCategoryDto.required).toEqual([
      'name',
    ]);
    expect(openApi.components.schemas.CreateCatalogProductDto.required).toEqual([
      'name',
      'categoryId',
      'priceInCents',
    ]);
    expect(
      openApi.components.schemas.UpdateCatalogProductDto.properties
        ?.prepTimeMinutes.nullable,
    ).toBe(true);
    expect(openApi.paths['/catalog/categories'].post.responses?.['403']).toBeDefined();
    expect(openApi.paths['/catalog/categories/{id}'].patch.responses?.['403']).toBeDefined();
    expect(openApi.paths['/catalog/categories/{id}'].delete.responses?.['403']).toBeDefined();
    expect(openApi.paths['/catalog/products'].post.responses?.['403']).toBeDefined();
    expect(openApi.paths['/catalog/products'].get.responses?.['403']).toBeDefined();
    expect(openApi.paths['/catalog/products/{id}'].patch.responses?.['403']).toBeDefined();
    expect(openApi.paths['/catalog/products/{id}'].delete.responses?.['403']).toBeDefined();
    expect(openApi.paths['/catalog/products'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'categoryId', in: 'query' }),
        expect.objectContaining({ name: 'includeArchived', in: 'query' }),
      ]),
    );
    expect(openApi.paths['/catalog/categories/{id}'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        }),
      ]),
    );
  });

  it('requires an authenticated session to read categories', async () => {
    const response = await request('/catalog/categories');

    expect(response.status).toBe(401);
  });

  it('lets an owner manage products, normalizes category uniqueness, and restores archives', async () => {
    const category = await createCategory(ownerToken, 'Café');
    expect(category.response.status).toBe(201);
    expect(category.body.name).toBe('Café');
    const categoryId = String(category.body.id);

    const categoryRead = await request(`/catalog/categories/${categoryId}`, {
      token: ownerToken,
    });
    expect(categoryRead.status).toBe(200);
    await expect(categoryRead.json()).resolves.toMatchObject({
      id: categoryId,
      productCount: 0,
      displayOrder: 0,
    });

    const duplicate = await createCategory(ownerToken, ' cafe\u0301 ');
    expect(duplicate.response.status).toBe(409);

    const categoryUpdate = await request(`/catalog/categories/${categoryId}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { description: 'Bebidas feitas na hora.' },
    });
    expect(categoryUpdate.status).toBe(200);
    await expect(categoryUpdate.json()).resolves.toMatchObject({
      description: 'Bebidas feitas na hora.',
    });
    const clearedCategory = await request(`/catalog/categories/${categoryId}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { description: null, imageUrl: null },
    });
    expect(clearedCategory.status).toBe(200);
    await expect(clearedCategory.json()).resolves.toMatchObject({
      description: null,
      imageUrl: null,
    });
    expect(
      (
        await request(`/catalog/categories/${categoryId}`, {
          method: 'PATCH',
          token: ownerToken,
          body: { displayOrder: null },
        })
      ).status,
    ).toBe(400);

    const created = await createProduct(ownerToken, categoryId);
    expect(created.response.status).toBe(201);
    expect(created.body).toMatchObject({
      categoryId,
      priceInCents: 1290,
      available: true,
      featured: false,
      dietaryTags: [],
      prepTimeMinutes: null,
      isActive: true,
    });
    const productId = String(created.body.id);

    expect(
      (await request(`/catalog/products/${productId}`, { token: ownerToken }))
        .status,
    ).toBe(200);

    const changed = await request(`/catalog/products/${productId}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { available: false },
    });
    expect(changed.status).toBe(200);
    await expect(changed.json()).resolves.toMatchObject({ available: false });

    const clearedProduct = await request(`/catalog/products/${productId}`, {
      method: 'PATCH',
      token: ownerToken,
      body: {
        description: null,
        imageUrl: null,
        prepTimeMinutes: null,
        dietaryTags: [],
      },
    });
    expect(clearedProduct.status).toBe(200);
    await expect(clearedProduct.json()).resolves.toMatchObject({
      description: null,
      imageUrl: null,
      prepTimeMinutes: null,
      dietaryTags: [],
    });
    for (const body of [
      { name: null },
      { categoryId: null },
      { priceInCents: null },
      { available: null },
      { featured: null },
      { dietaryTags: null },
      { isActive: null },
    ]) {
      expect(
        (
          await request(`/catalog/products/${productId}`, {
            method: 'PATCH',
            token: ownerToken,
            body,
          })
        ).status,
      ).toBe(400);
    }

    const blockedCategoryDelete = await request(
      `/catalog/categories/${categoryId}`,
      {
        method: 'DELETE',
        token: ownerToken,
      },
    );
    expect(blockedCategoryDelete.status).toBe(409);

    const archived = await request(`/catalog/products/${productId}`, {
      method: 'DELETE',
      token: ownerToken,
    });
    expect(archived.status).toBe(204);

    const categoryAfterArchive = await request(
      `/catalog/categories/${categoryId}`,
      { token: ownerToken },
    );
    await expect(categoryAfterArchive.json()).resolves.toMatchObject({
      productCount: 1,
    });

    const activeProducts = await request('/catalog/products', {
      token: ownerToken,
    });
    expect(activeProducts.status).toBe(200);
    await expect(activeProducts.json()).resolves.toEqual([]);

    const archivedProducts = await request(
      '/catalog/products?includeArchived=true',
      {
        token: ownerToken,
      },
    );
    expect(archivedProducts.status).toBe(200);
    await expect(archivedProducts.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: productId, isActive: false }),
      ]),
    );

    const restored = await request(`/catalog/products/${productId}`, {
      method: 'PATCH',
      token: ownerToken,
      body: { isActive: true },
    });
    expect(restored.status).toBe(200);
    await expect(restored.json()).resolves.toMatchObject({ isActive: true });

    const emptyCategory = await createCategory(ownerToken, 'Categoria vazia');
    expect(emptyCategory.response.status).toBe(201);
    const emptyCategoryId = String(emptyCategory.body.id);
    expect(
      (
        await request(`/catalog/categories/${emptyCategoryId}`, {
          method: 'DELETE',
          token: ownerToken,
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await request(`/catalog/categories/${emptyCategoryId}`, {
          token: ownerToken,
        })
      ).status,
    ).toBe(404);
  });

  it('allows admins to request archived products but keeps archived records tenant-scoped', async () => {
    const category = await createCategory(adminToken, 'Categoria admin');
    expect(category.response.status).toBe(201);
    const product = await createProduct(
      adminToken,
      String(category.body.id),
      'Produto admin',
    );
    expect(product.response.status).toBe(201);
    const productId = String(product.body.id);
    expect(
      (
        await request(`/catalog/products/${productId}`, {
          method: 'DELETE',
          token: adminToken,
        })
      ).status,
    ).toBe(204);

    const response = await request('/catalog/products?includeArchived=true', {
      token: adminToken,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: productId, isActive: false }),
      ]),
    );
  });

  it('allows staff to read but rejects every catalog mutation and archived listing', async () => {
    const category = await createCategory(ownerToken, 'Leitura staff');
    expect(category.response.status).toBe(201);
    const categoryId = String(category.body.id);
    const product = await createProduct(
      ownerToken,
      categoryId,
      'Produto staff',
    );
    expect(product.response.status).toBe(201);
    const productId = String(product.body.id);

    expect(
      (await request('/catalog/categories', { token: staffToken })).status,
    ).toBe(200);
    expect(
      (await request('/catalog/products', { token: staffToken })).status,
    ).toBe(200);
    expect(
      (
        await request(`/catalog/products/${productId}`, {
          method: 'DELETE',
          token: ownerToken,
        })
      ).status,
    ).toBe(204);
    expect(
      (await request(`/catalog/products/${productId}`, { token: staffToken }))
        .status,
    ).toBe(404);
    expect(
      (
        await request('/catalog/products?includeArchived=true', {
          token: staffToken,
        })
      ).status,
    ).toBe(403);
    expect(
      (await createCategory(staffToken, 'Sem permissão')).response.status,
    ).toBe(403);
    expect((await createProduct(staffToken, categoryId)).response.status).toBe(
      403,
    );
    expect(
      (
        await request(`/catalog/categories/${categoryId}`, {
          method: 'PATCH',
          token: staffToken,
          body: { name: 'Alterada por staff' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(`/catalog/products/${productId}`, {
          method: 'PATCH',
          token: staffToken,
          body: { available: false },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(`/catalog/categories/${categoryId}`, {
          method: 'DELETE',
          token: staffToken,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(`/catalog/products/${productId}`, {
          method: 'DELETE',
          token: staffToken,
        })
      ).status,
    ).toBe(403);
  });

  it('rejects forged tenant fields in request bodies', async () => {
    const restaurant = await prisma.restaurant.findUniqueOrThrow({
      where: { slug: restaurantB.slug },
    });
    const response = await request('/catalog/categories', {
      method: 'POST',
      token: ownerToken,
      body: { name: 'Tenant forjado', restaurantId: restaurant.id },
    });

    expect(response.status).toBe(400);

    const category = await createCategory(
      ownerToken,
      'Categoria com validação',
    );
    expect(category.response.status).toBe(201);
    const productResponse = await request('/catalog/products', {
      method: 'POST',
      token: ownerToken,
      body: {
        name: 'Produto com tenant forjado',
        categoryId: category.body.id,
        priceInCents: 100,
        restaurantId: restaurant.id,
      },
    });
    expect(productResponse.status).toBe(400);
  });

  it('validates cents, preparation time, tags, order, and HTTPS image URLs', async () => {
    const category = await createCategory(ownerToken, 'Validação');
    expect(category.response.status).toBe(201);
    const categoryId = String(category.body.id);

    const invalidProducts = [
      { name: 'Preço decimal', categoryId, priceInCents: 12.5 },
      { name: 'Preço acima do limite', categoryId, priceInCents: 2_147_483_648 },
      { name: 'Preço nulo', categoryId, priceInCents: null },
      {
        name: 'Disponibilidade nula',
        categoryId,
        priceInCents: 100,
        available: null,
      },
      {
        name: 'Etiquetas nulas',
        categoryId,
        priceInCents: 100,
        dietaryTags: null,
      },
      {
        name: 'Preparo longo',
        categoryId,
        priceInCents: 100,
        prepTimeMinutes: 1_441,
      },
      {
        name: 'Muitas tags',
        categoryId,
        priceInCents: 100,
        dietaryTags: Array.from({ length: 21 }, () => 'vegano'),
      },
      {
        name: 'Imagem insegura',
        categoryId,
        priceInCents: 100,
        imageUrl: 'http://example.com/product.jpg',
      },
    ];
    for (const body of invalidProducts) {
      expect(
        (
          await request('/catalog/products', {
            method: 'POST',
            token: ownerToken,
            body,
          })
        ).status,
      ).toBe(400);
    }

    for (const displayOrder of [-1, 2_147_483_648]) {
      expect(
        (
          await request('/catalog/categories', {
            method: 'POST',
            token: ownerToken,
            body: { name: `Ordem inválida ${displayOrder}`, displayOrder },
          })
        ).status,
      ).toBe(400);
    }

    expect(
      (
        await request('/catalog/categories', {
          method: 'POST',
          token: ownerToken,
          body: { name: 'Descrição nula', description: null },
        })
      ).status,
    ).toBe(400);

    const validCategory = await createCategory(ownerToken, 'Ordem editável');
    expect(validCategory.response.status).toBe(201);
    expect(
      (
        await request(`/catalog/categories/${String(validCategory.body.id)}`, {
          method: 'PATCH',
          token: ownerToken,
          body: { displayOrder: 2_147_483_648 },
        })
      ).status,
    ).toBe(400);
  });

  it('hides another restaurant resources and rejects cross-tenant category references', async () => {
    const category = await createCategory(ownerToken, 'Privada A');
    expect(category.response.status).toBe(201);
    const categoryId = String(category.body.id);
    const product = await createProduct(
      ownerToken,
      categoryId,
      'Produto privado A',
    );
    expect(product.response.status).toBe(201);
    const productId = String(product.body.id);

    expect(
      (
        await request(`/catalog/categories/${categoryId}`, {
          token: adminToken,
        })
      ).status,
    ).toBe(404);
    expect(
      (await request(`/catalog/products/${productId}`, { token: adminToken }))
        .status,
    ).toBe(404);
    expect(
      (
        await request(`/catalog/categories/${categoryId}`, {
          method: 'PATCH',
          token: adminToken,
          body: { name: 'Tentativa cruzada' },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/catalog/categories/${categoryId}`, {
          method: 'DELETE',
          token: adminToken,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/catalog/products/${productId}`, {
          method: 'PATCH',
          token: adminToken,
          body: { available: false },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/catalog/products/${productId}`, {
          method: 'DELETE',
          token: adminToken,
        })
      ).status,
    ).toBe(404);

    const crossTenantProduct = await createProduct(
      adminToken,
      categoryId,
      'Categoria de outro tenant',
    );
    expect(crossTenantProduct.response.status).toBe(404);
    expect(
      (
        await request('/catalog/categories', { token: adminToken }).then(
          (response) => response.json(),
        )
      ).some((entry: { id: string }) => entry.id === categoryId),
    ).toBe(false);
  });
});
