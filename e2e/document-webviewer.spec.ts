import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { AppShellPage } from './pages/AppShellPage';
import { Auth0LoginPage } from './pages/Auth0LoginPage';
import { DocumentPage } from './pages/DocumentPage';
import { HomePage } from './pages/HomePage';
import { getE2ECredentials } from './support/credentials';

test.describe('document page webviewer interactions', () => {
  const credentials = getE2ECredentials();
  const samplePdfPath = path.resolve(process.cwd(), 'e2e/fixtures/files/alex_carter_cv.pdf');

  test.skip(!credentials.email || !credentials.password, 'E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD are required');

  async function loginAndOpenHome(page: Page): Promise<HomePage> {
    const appShellPage = new AppShellPage(page);
    const auth0LoginPage = new Auth0LoginPage(page);
    const homePage = new HomePage(page);

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
      await auth0LoginPage.expectLoaded();
      await auth0LoginPage.login(credentials.email!, credentials.password!);
      await page.waitForURL((url) => !url.href.includes('auth0.com'), { timeout: 30_000 });
    }

    await homePage.completeProfilePromptIfPresent();
    await homePage.expectLoaded();
    return homePage;
  }

  test('loads webviewer and supports basic toolbar interaction', async ({ page }) => {
    test.setTimeout(120_000);

    const homePage = await loginAndOpenHome(page);
    await homePage.uploadPdf(samplePdfPath);
    await homePage.startCollaboration();
    await homePage.expectRedirectedToDocumentPage();

    const documentPage = new DocumentPage(page);
    await documentPage.expectLoaded();
    await documentPage.completeNameDialogIfPresent();
    await documentPage.expectWebViewerInstanceReady();

    const nextAnnotationUser = 'E2E Annotation User';
    const { before, after } = await documentPage.setCurrentAnnotationUser(nextAnnotationUser);
    expect(after).toBe(nextAnnotationUser);
    expect(after).not.toBe(before);
  });
});
