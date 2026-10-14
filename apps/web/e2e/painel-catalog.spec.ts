import { expect, test, type Page } from '@playwright/test';

const categoryId = 'fa3103b4-39dd-4e5d-9204-d2b3da8a6f87';
const productId = 'cb62d0d2-3b99-4e1d-9b13-b68d0f94a8e3';
const session = {
  user: { id: 'user-id', name: 'Enzo Bellussi', email: 'enzo@example.com' },
  restaurant: { id: 'restaurant-id', name: 'Casa do Enzo', slug: 'casa-do-enzo' },
  membership: { id: 'membership-id', role: 'OWNER' },
  expiresAt: '2027-10-13T12:00:00.000Z',
};

async function expectMobileCatalogEditor(page: Page, saveLabel: string) {
  const editor = page.locator('.painel-editor-form');
  const bounds = await editor.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);

  const saveButton = await page.getByRole('button', { name: saveLabel }).boundingBox();
  expect(saveButton?.height).toBeGreaterThanOrEqual(44);

  const dimensions = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.viewportWidth).toBe(320);
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

test('owner logs in, maintains the catalog, restores an archived product, and logs out', async ({ page }) => {
  const categories: Array<Record<string, unknown>> = [];
  const products: Array<Record<string, unknown>> = [];
  const catalogRequests: Array<{ method: string; path: string; body?: unknown }> = [];
  const browserErrors: string[] = [];
  const loginCalls: string[] = [];

  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.route('**/api/auth/login', async (route) => {
    loginCalls.push(`${route.request().method()} ${route.request().url()}`);
    await route.fulfill({ status: 200, json: session });
  });
  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({ status: 200, json: session });
  });
  await page.route('**/api/admin/catalog/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/admin/catalog', '');
    const method = request.method();
    const body = request.postDataJSON();
    catalogRequests.push({ method, path, ...(body ? { body } : {}) });

    if (path === '/categories' && method === 'GET') {
      await route.fulfill({ status: 200, json: categories });
      return;
    }
    if (path === '/categories' && method === 'POST') {
      const category = {
        id: categoryId,
        restaurantId: 'restaurant-id',
        name: body.name,
        nameNormalized: String(body.name).trim().toLowerCase(),
        displayOrder: body.displayOrder ?? 0,
        description: body.description ?? null,
        imageUrl: null,
        productCount: 0,
        createdAt: session.expiresAt,
        updatedAt: session.expiresAt,
      };
      categories.push(category);
      await route.fulfill({ status: 201, json: category });
      return;
    }
    if (path === '/products' && method === 'GET') {
      const visibleProducts = url.searchParams.get('includeArchived') === 'true'
        ? products
        : products.filter((product) => product.isActive);
      await route.fulfill({ status: 200, json: visibleProducts });
      return;
    }
    if (path === '/products' && method === 'POST') {
      const product = {
        id: productId,
        restaurantId: 'restaurant-id',
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? null,
        priceInCents: body.priceInCents,
        imageUrl: body.imageUrl ?? null,
        available: body.available ?? true,
        featured: body.featured ?? false,
        dietaryTags: body.dietaryTags ?? [],
        prepTimeMinutes: body.prepTimeMinutes ?? null,
        isActive: true,
        createdAt: session.expiresAt,
        updatedAt: session.expiresAt,
      };
      products.push(product);
      const category = categories.find((entry) => entry.id === body.categoryId);
      if (category) category.productCount = Number(category.productCount) + 1;
      await route.fulfill({ status: 201, json: product });
      return;
    }

    const productMatch = /^\/products\/([^/]+)$/.exec(path);
    const product = productMatch
      ? products.find((entry) => entry.id === productMatch[1])
      : undefined;
    if (!product) {
      await route.fulfill({ status: 404, json: { message: 'Not found' } });
      return;
    }
    if (method === 'PATCH') {
      Object.assign(product, body);
      await route.fulfill({ status: 200, json: product });
      return;
    }
    if (method === 'DELETE') {
      product.isActive = false;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({ status: 405, json: { message: 'Method not allowed' } });
  });

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/painel/login');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  let dimensions = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  const email = page.getByLabel('E-mail');
  await email.focus();
  await expect(email).toHaveCSS('outline-style', 'solid');
  await expect(email).toHaveCSS('outline-width', '3px');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.locator('.painel-login-card').evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    ),
  ).toBeLessThanOrEqual(0.001);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByLabel('E-mail').fill('enzo@example.com');
  await page.getByLabel('Senha').fill('password-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  try {
    await expect(page).toHaveURL(/\/painel\/catalogo$/);
  } catch (error) {
    throw new Error(
      `${String(error)}\nLogin route calls: ${loginCalls.join(', ') || 'none'}\nBrowser errors: ${browserErrors.join(' | ') || 'none'}`,
    );
  }
  await expect(
    page.getByRole('complementary', { name: 'Navegação do painel' }).getByText('Casa do Enzo'),
  ).toBeVisible();
  const overviewLink = page.locator('.painel-sidebar .painel-nav-link').first();
  let overviewFocused = await overviewLink.evaluate((link) => link === document.activeElement);
  for (let tabCount = 0; !overviewFocused && tabCount < 8; tabCount += 1) {
    await page.keyboard.press('Tab');
    overviewFocused = await overviewLink.evaluate((link) => link === document.activeElement);
  }
  expect(overviewFocused).toBe(true);
  await expect(overviewLink).toHaveCSS('outline-color', 'rgb(216, 173, 97)');
  await page.setViewportSize({ width: 320, height: 800 });
  const mobileBrand = page.locator('.painel-mobile-header .painel-brand');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let mobileBrandFocused = false;
  for (let tabCount = 0; !mobileBrandFocused && tabCount < 12; tabCount += 1) {
    await page.keyboard.press('Tab');
    mobileBrandFocused = await mobileBrand.evaluate((link) => link === document.activeElement);
  }
  expect(mobileBrandFocused).toBe(true);
  await expect(mobileBrand).toHaveCSS('outline-color', 'rgb(216, 173, 97)');
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole('button', { name: 'Criar categoria e incluir o primeiro produto' }).click();
  await expectMobileCatalogEditor(page, 'Salvar categoria');
  await page.getByLabel('Nome da categoria').fill('Bebidas');
  await page.getByRole('button', { name: 'Salvar categoria' }).click();
  await expect(page.getByRole('heading', { name: 'Novo produto' })).toBeVisible();
  await expectMobileCatalogEditor(page, 'Salvar produto');
  await expect(page.getByLabel('Categoria')).toHaveValue(categoryId);

  await page.getByLabel('Nome do produto').fill('Suco de laranja');
  await page.getByLabel('Preço (R$)').fill('12,34');
  await page.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(page.getByText('Suco de laranja')).toBeVisible();
  await expect(page.getByText('R$ 12,34')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByRole('button', { name: 'Marcar Suco de laranja indisponível' }).click();
  await expect(page.getByText('Indisponível')).toBeVisible();
  await page.getByRole('button', { name: 'Arquivar Suco de laranja' }).click();
  await expect(page.getByText('Suco de laranja')).not.toBeVisible();

  await page.getByRole('button', { name: 'Mostrar arquivados' }).click();
  await expect(page.getByText('Suco de laranja')).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar Suco de laranja' }).click();
  await expect(page.getByText('Suco de laranja')).toBeVisible();

  await page.getByRole('tab', { name: /Categorias/ }).click();
  await page.getByRole('button', { name: 'Excluir Bebidas' }).click();
  const confirmation = page.getByRole('alertdialog', { name: 'Excluir categoria?' });
  await expect(confirmation).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const confirmationOverlayDuration = await page.locator('.painel-confirm-overlay').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).animationDuration),
  );
  expect(confirmationOverlayDuration).toBeLessThanOrEqual(0.001);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('tab', { name: /Produtos/ }).click();

  expect(catalogRequests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ method: 'POST', path: '/categories' }),
      expect.objectContaining({
        method: 'POST',
        path: '/products',
        body: expect.objectContaining({ priceInCents: 1234 }),
      }),
      expect.objectContaining({ method: 'PATCH', path: `/products/${productId}` }),
      expect.objectContaining({ method: 'DELETE', path: `/products/${productId}` }),
      expect.objectContaining({
        method: 'PATCH',
        path: `/products/${productId}`,
        body: expect.objectContaining({ isActive: true }),
      }),
    ]),
  );

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('heading', { name: 'Cardápio com ordem.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Novo produto' })).toBeVisible();
    if (viewport.width <= 360) {
      await expect(page.getByText('Ativar', { exact: true })).toBeVisible();
      const availabilityTarget = await page.getByRole('button', {
        name: 'Marcar Suco de laranja disponível',
      }).boundingBox();
      expect(availabilityTarget?.height).toBeGreaterThanOrEqual(44);
      const actionLabelFontSize = await page
        .locator('.painel-product-actions .painel-action-label')
        .first()
        .evaluate((label) => Number.parseFloat(getComputedStyle(label).fontSize));
      expect(actionLabelFontSize).toBeGreaterThanOrEqual(12);
    }
    dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    await page.screenshot({
      path: `test-results/painel-catalog-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  }

  await page.getByLabel('Buscar produto ou categoria').focus();
  await expect(page.getByLabel('Buscar produto ou categoria')).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.locator('.painel-product-card').first().evaluate((element) =>
      getComputedStyle(element).animationName,
    ),
  ).toBe('none');

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/painel\/login$/);
});
