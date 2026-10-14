import { defineConfig } from '@playwright/test';

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    env: {
      COMANDINHA_WEB_DIST_DIR: '.next-playwright',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
