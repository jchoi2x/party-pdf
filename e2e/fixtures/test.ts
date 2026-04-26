import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { isAuthAvailable, USER_STATE_PATH } from '../helpers/auth';

export { expect };

/** Re-export base test for public (unauthenticated) tests. */
export const test = base;

type AuthFixtures = { page: Page };

/**
 * authTest — identical to `test` but:
 *   1. Opens a fresh browser context pre-loaded with the saved Auth0 storageState.
 *   2. Skips automatically when global-setup could not produce a valid session
 *      (missing credentials or Auth0 misconfiguration).
 *
 * Usage:
 *   import { authTest as test, expect } from '../fixtures/test';
 *
 *   test('dashboard loads', async ({ page }) => { ... });
 */
export const authTest = base.extend<AuthFixtures>({
  page: async ({ browser }, use, testInfo) => {
    if (!isAuthAvailable()) {
      testInfo.skip(
        true,
        'Authenticated session not available. ' +
          'Add E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, and AUTH0_DOMAIN to .dev.vars, ' +
          'then re-run tests to enable auth-dependent suites.',
      );
    }

    // After testInfo.skip() the runner throws internally, but TypeScript needs
    // a code path past the if-block. The context below is only reached when auth IS available.
    const context = await browser.newContext({ storageState: USER_STATE_PATH });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
