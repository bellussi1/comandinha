import { expect, test } from '@playwright/test';

const tableCode = 'Q'.repeat(43);
const tableId = '82e80217-0035-4da6-9e6f-76221a172fda';
const productId = '0f7b1db9-cba9-4d4b-a5ea-ae798e56b53a';
const orderId = 'ad97f868-d026-4ca8-a765-dd34acdb643f';
const createdAt = '2026-10-13T12:00:00.000Z';

const session = {
  user: { id: 'user-id', name: 'Enzo Bellussi', email: 'enzo@example.com' },
  restaurant: { id: 'restaurant-id', name: 'Casa do Enzo', slug: 'casa-do-enzo' },
  membership: { id: 'membership-id', role: 'OWNER' },
  expiresAt: '2027-10-13T12:00:00.000Z',
};

const table = {
  id: tableId,
  restaurantId: 'restaurant-id',
  name: 'Mesa 01',
  publicCode: tableCode,
  isActive: true,
  createdAt,
  updatedAt: createdAt,
  activeOrderCount: 0,
};

const menu = {
  restaurant: { name: 'Casa do Enzo' },
  table: { name: 'Mesa 01' },
  categories: [
    {
      id: '02b35e28-760d-4558-94c5-4e0b9244be6b',
      name: 'Lanches',
      description: 'Feitos na hora.',
      products: [
        {
          id: productId,
          name: 'Smash clássico',
          description: 'Pão, carne e queijo.',
          priceInCents: 2990,
          imageUrl: null,
          featured: true,
          dietaryTags: [],
          prepTimeMinutes: 12,
        },
      ],
    },
  ],
};

test('owner opens a table QR, sends an order, advances it, and sees public tracking update', async ({
  page,
  context,
}) => {
  let orderStatus: 'PENDING' | 'PREPARING' = 'PENDING';
  let orderCreated = false;
  let submittedPayload: unknown;

  const publicSummary = () => ({
    id: orderId,
    status: orderStatus,
    totalInCents: 2990,
    createdAt,
    items: [
      {
        nameSnapshot: 'Smash clássico',
        quantity: 1,
        unitPriceInCents: 2990,
        lineTotalInCents: 2990,
      },
    ],
  });

  const panelOrder = () => ({
    ...publicSummary(),
    restaurantId: 'restaurant-id',
    tableId,
    notes: null,
    updatedAt: createdAt,
    table: { id: tableId, name: 'Mesa 01' },
    items: [
      {
        id: 'b19a9f58-17b1-4a88-8da2-570c3b43d540',
        nameSnapshot: 'Smash clássico',
        unitPriceInCents: 2990,
        quantity: 1,
        notes: null,
        lineTotalInCents: 2990,
      },
    ],
  });

  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === '/api/auth/login' && method === 'POST') {
      await route.fulfill({ status: 200, json: session });
      return;
    }
    if (url.pathname === '/api/auth/session' && method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (url.pathname === '/api/auth/session' && method === 'GET') {
      await route.fulfill({ status: 200, json: session });
      return;
    }
    if (url.pathname.startsWith('/api/admin/catalog/')) {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    if (url.pathname === '/api/admin/tables' && method === 'GET') {
      await route.fulfill({ status: 200, json: [table] });
      return;
    }
    if (url.pathname === '/api/admin/orders/summary' && method === 'GET') {
      await route.fulfill({
        status: 200,
        json: { PENDING: 1, PREPARING: 0, READY: 0, DELIVERED: 0, CANCELLED: 0 },
      });
      return;
    }
    if (url.pathname === '/api/admin/orders' && method === 'GET') {
      const orders = orderCreated ? [panelOrder()] : [];
      const status = url.searchParams.get('status');
      await route.fulfill({
        status: 200,
        json: status ? orders.filter((order) => order.status === status) : orders,
      });
      return;
    }
    if (url.pathname === `/api/admin/orders/${orderId}/status` && method === 'PATCH') {
      const body = request.postDataJSON() as { status: 'PENDING' | 'PREPARING' };
      orderStatus = body.status;
      await route.fulfill({ status: 200, json: panelOrder() });
      return;
    }
    if (url.pathname === `/api/public/tables/${tableCode}/menu` && method === 'GET') {
      await route.fulfill({ status: 200, json: menu });
      return;
    }
    if (url.pathname === `/api/public/tables/${tableCode}/orders` && method === 'GET') {
      await route.fulfill({ status: 200, json: orderCreated ? [publicSummary()] : [] });
      return;
    }
    if (url.pathname === `/api/public/tables/${tableCode}/orders` && method === 'POST') {
      submittedPayload = request.postDataJSON();
      orderCreated = true;
      await route.fulfill({
        status: 201,
        json: {
          id: orderId,
          status: orderStatus,
          totalInCents: 2990,
          createdAt,
          items: publicSummary().items,
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'Unexpected test API request' } });
  });

  await page.goto('/painel/login');
  await page.getByLabel('E-mail').fill('enzo@example.com');
  await page.getByLabel('Senha').fill('password-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/painel\/catalogo$/);

  await page.goto('/painel');
  await expect(page.getByRole('heading', { name: 'Bom trabalho, Enzo.' })).toBeVisible();
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.getByRole('link', { name: /Acompanhar pedidos/ })).toBeVisible();
  }
  const firstDashboardShortcut = page.locator('.painel-dashboard-shortcut').first();
  await firstDashboardShortcut.focus();
  await expect(firstDashboardShortcut).toHaveCSS('outline-style', 'solid');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const dashboardMotion = await page.locator('.painel-dashboard-metric').first().evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).animationDuration),
  );
  expect(dashboardMotion).toBeLessThanOrEqual(0.001);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.goto('/painel/mesas');
  await expect(page.getByRole('heading', { name: 'Mesas com acesso direto.' })).toBeVisible();
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.getByRole('button', { name: 'Ver QR de Mesa 01' })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Ver QR de Mesa 01' }).click();
  await expect(page.getByRole('dialog', { name: 'QR da Mesa 01' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QR da Mesa 01' })).toHaveCSS(
    'color',
    'rgb(64, 34, 58)',
  );

  const publicLinkInput = page.getByLabel('Link público');
  await publicLinkInput.focus();
  await expect(publicLinkInput).toHaveCSS('outline-style', 'solid');
  const publicUrl = await publicLinkInput.inputValue();
  expect(new URL(publicUrl).pathname).toBe(`/q/${tableCode}`);
  await expect(page.getByRole('img', { name: 'Código QR para Mesa 01' })).toBeVisible();
  await page.goto(publicUrl);
  await expect(page.getByRole('heading', { name: 'Casa do Enzo' })).toBeVisible();
  await expect(page.getByText('Smash clássico')).toBeVisible();

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }

  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'Adicionar Smash clássico ao carrinho' }).click();
  await page.getByRole('button', { name: /Abrir carrinho/ }).click();
  const cart = page.getByRole('dialog', { name: 'Seu carrinho' });
  await expect(cart).toBeVisible();
  const cartBounds = await cart.boundingBox();
  expect(cartBounds).not.toBeNull();
  expect(cartBounds!.x).toBeGreaterThanOrEqual(0);
  expect(cartBounds!.x + cartBounds!.width).toBeLessThanOrEqual(360);
  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  await expect(page.getByText('Pedido recebido pelo restaurante')).toBeVisible();
  expect(submittedPayload).toEqual({ items: [{ productId, quantity: 1 }] });

  await page.goto('/painel/pedidos');
  await expect(page.getByRole('heading', { name: 'Pedidos, sem perder o ritmo.' })).toBeVisible();
  await expect(page.getByText('Smash clássico')).toBeVisible();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const dimensions = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
  const reducedMotionDuration = await page.locator('.painel-order-card').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).animationDuration),
  );
  expect(reducedMotionDuration).toBeLessThanOrEqual(0.001);

  await page.getByRole('button', { name: 'Iniciar preparo do pedido da Mesa 01' }).click();
  await expect(page.locator('.painel-order-status')).toHaveText('Em preparo');
  await page.goto(publicUrl);
  await expect(page.getByText('Seu pedido está sendo preparado')).toBeVisible();
  await expect(page.locator('.public-order-status')).toHaveText('Preparando');
});

test('keeps legacy admin and table menu routes reachable during migration', async ({ page }) => {
  const legacyTableUuid = 'legacy-table-uuid';

  await page.addInitScript(() => {
    localStorage.setItem('@comandinha:auth_token', 'Bearer legacy-test-token');
    localStorage.setItem(
      '@comandinha:user_data',
      JSON.stringify({ id: 1, nome: 'Enzo Bellussi', email: 'enzo@example.com' }),
    );
  });

  await page.route('**/admin/me', async (route) => {
    await route.fulfill({
      status: 200,
      json: { id: 1, nome: 'Enzo Bellussi', email: 'enzo@example.com' },
    });
  });
  await page.route('**/pedidos/producao', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/mesas/uuid/**', async (route) => {
    await route.fulfill({
      status: 200,
      json: { id: 42, uuid: legacyTableUuid, nome: 'Mesa Legada', status: 'ativa' },
    });
  });
  await page.route('**/categorias', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/produtos', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });

  const adminResponse = await page.goto('/admin');
  expect(adminResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Painel Administrativo' })).toBeVisible();

  const menuResponse = await page.goto(`/mesa/${legacyTableUuid}`);
  expect(menuResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Mesa 42' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cardápio' })).toBeVisible();
});
