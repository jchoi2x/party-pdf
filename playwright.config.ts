import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
const serverOrigin = new URL(baseURL).origin;
const serverPort = new URL(baseURL).port || '5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `PLAYWRIGHT_E2E=1 bun run dev --port ${serverPort}`,
    url: serverOrigin,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
