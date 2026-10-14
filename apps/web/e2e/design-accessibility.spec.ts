import { expect, test } from '@playwright/test';

function colorChannels(color: string): [number, number, number] {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim());
  if (hex) {
    const value = hex[1].length === 3
      ? hex[1].split('').map((part) => Number.parseInt(part + part, 16))
      : [0, 2, 4].map((index) => Number.parseInt(hex[1].slice(index, index + 2), 16));
    return value as [number, number, number];
  }

  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(color);
  if (!rgb) throw new Error(`Unsupported color format: ${color}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

function relativeLuminance(color: string): number {
  const channels = colorChannels(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (first, second) => second - first,
  );
  return (luminance[0] + 0.05) / (luminance[1] + 0.05);
}

test('panel supporting text and login accent meet WCAG AA contrast', async ({ page }) => {
  await page.goto('/painel/login');
  await expect(page.locator('.painel-login-panel-top')).toBeVisible();

  const colors = await page.locator('.painel-root').evaluate((root) => {
    const surface = getComputedStyle(root).getPropertyValue('--painel-paper').trim();
    const supportingText = getComputedStyle(
      root.querySelector('.painel-login-panel-top')!,
    ).color;
    const plum = getComputedStyle(
      root.querySelector('.painel-login-story')!,
    ).backgroundColor;
    const accentText = getComputedStyle(
      root.querySelector('.painel-login-story-copy .painel-eyebrow')!,
    ).color;
    return { surface, supportingText, plum, accentText };
  });

  expect.soft(contrastRatio(colors.supportingText, colors.surface)).toBeGreaterThanOrEqual(4.5);
  expect.soft(contrastRatio(colors.accentText, colors.plum)).toBeGreaterThanOrEqual(4.5);

  const storyBrand = page.locator('.painel-login-story .painel-login-brand');
  await storyBrand.focus();
  await expect(storyBrand).toHaveCSS('outline-style', 'solid');
  const focusColors = await storyBrand.evaluate((link) => ({
    outline: getComputedStyle(link).outlineColor,
    surface: getComputedStyle(link.closest('.painel-login-story')!).backgroundColor,
  }));
  expect(contrastRatio(focusColors.outline, focusColors.surface)).toBeGreaterThanOrEqual(3);
});

test('public menu supporting text and accent meet WCAG AA contrast', async ({ page }) => {
  const code = 'D'.repeat(43);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/public/tables/' + code + '/menu') {
      await route.fulfill({
        status: 200,
        json: {
          restaurant: { name: 'Casa do Enzo' },
          table: { name: 'Mesa 01' },
          categories: [
            {
              id: 'drinks',
              name: 'Bebidas',
              description: 'Feitas na hora.',
              products: [
                {
                  id: 'juice',
                  name: 'Suco de laranja',
                  description: 'Natural e gelado.',
                  priceInCents: 1234,
                  imageUrl: null,
                  featured: false,
                  dietaryTags: [],
                  prepTimeMinutes: null,
                },
              ],
            },
          ],
        },
      });
      return;
    }
    await route.fulfill({ status: 200, json: [] });
  });

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/q/${code}`);
  await expect(page.getByRole('heading', { name: 'Casa do Enzo' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

  const addButton = page.getByRole('button', { name: 'Adicionar Suco de laranja ao carrinho' });
  await addButton.focus();
  await expect(addButton).toHaveCSS('outline-style', 'solid');
  await expect(addButton).toHaveCSS('outline-width', '3px');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const productAnimationDuration = await page.locator('.public-menu-product').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).animationDuration),
  );
  expect(productAnimationDuration).toBeLessThanOrEqual(0.001);

  const colors = await page.locator('.public-menu-page').evaluate((root) => {
    const surface = getComputedStyle(root).getPropertyValue('--menu-paper').trim();
    const supportingText = getComputedStyle(
      root.querySelector('.public-menu-restaurant-copy p')!,
    ).color;
    const accentText = getComputedStyle(
      root.querySelector('.public-menu-intro .public-menu-eyebrow')!,
    ).color;
    return { surface, supportingText, accentText };
  });

  expect.soft(contrastRatio(colors.supportingText, colors.surface)).toBeGreaterThanOrEqual(4.5);
  expect.soft(contrastRatio(colors.accentText, colors.surface)).toBeGreaterThanOrEqual(4.5);
});


