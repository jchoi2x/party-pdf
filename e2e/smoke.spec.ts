import { test } from '@playwright/test';
import { AppShellPage } from './pages/AppShellPage';

test('app shell loads', async ({ page }) => {
  const appShellPage = new AppShellPage(page);

  await appShellPage.open();
  await appShellPage.expectAtAppOrAuth();

  const reachedAuth0 =
    appShellPage.isOnAuth0() ||
    (await page
      .waitForURL(/auth0\.com/, {
        timeout: 7_500,
      })
      .then(() => true)
      .catch(() => false));

  if (reachedAuth0) {
    await appShellPage.expectAuthPageOrErrorMessage();
    return;
  }

  await appShellPage.expectLoaded();
});
