import { expect, test } from '@playwright/test';
import { AppShellPage } from './pages/AppShellPage';
import { Auth0LoginPage } from './pages/Auth0LoginPage';
import { appOrigin } from './support/environment';
import { getE2ECredentials } from './support/credentials';

test.describe('authentication flow', () => {
  const credentials = getE2ECredentials();

  test.skip(!credentials.email || !credentials.password, 'E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD are required');

  test('redirects to Auth0 and returns to app after login', async ({ page }) => {
    const appShellPage = new AppShellPage(page);
    const auth0LoginPage = new Auth0LoginPage(page);

    await appShellPage.open();
    await auth0LoginPage.expectLoaded();
    await auth0LoginPage.login(credentials.email!, credentials.password!);

    await expect.poll(() => page.url(), { timeout: 30_000 }).toMatch(new RegExp(appOrigin.replace(/\./g, '\\.')));
    await expect(page).not.toHaveURL(/auth0\.com/);
    await appShellPage.expectLoaded();
  });
});
