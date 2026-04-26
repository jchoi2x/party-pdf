import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Load secrets from .dev.vars (wrangler dev vars file).
 * Required keys: E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE
 *
 * Run browser installs once:
 *   bunx playwright install --with-deps chromium
 */
dotenv.config({ path: '.dev.vars' });

const PORT = process.env.PORT ?? '3000';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [process.env.CI ? 'github' : 'list'],
  ],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    /**
     * Requires pre-built assets: run `bun run build` first.
     * Use `test:e2e:ci` script which handles the build step automatically.
     */
    command: `PORT=${PORT} bun run serve`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  outputDir: 'playwright-results',
});
