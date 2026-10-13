import { expect, test } from '@playwright/test';

test('serves the existing public entry point', async ({ page }) => {
  const response = await page.goto('/');

  expect(response).not.toBeNull();
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'COMANDINHA' })).toBeVisible();
});
