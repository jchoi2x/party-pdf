import path from 'node:path';
import { type Page, test } from '@playwright/test';
import { AppShellPage } from './pages/AppShellPage';
import { Auth0LoginPage } from './pages/Auth0LoginPage';
import { HomePage } from './pages/HomePage';
import { getE2ECredentials } from './support/credentials';

test.describe('home upload flow', () => {
  test.describe.configure({ mode: 'serial' });

  const credentials = getE2ECredentials();
  const samplePdfPath = path.resolve(process.cwd(), 'e2e/fixtures/files/alex_carter_cv.pdf');
  const samplePdfPath2 = path.resolve(process.cwd(), 'e2e/fixtures/files/alex_carter_resume.pdf');

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

  test('uploads a PDF and redirects to the document page', async ({ page }) => {
    const homePage = await loginAndOpenHome(page);
    await homePage.uploadPdf(samplePdfPath);
    await homePage.startCollaboration();
    await homePage.expectRedirectedToDocumentPage();
  });

  test('uploads multiple PDFs and redirects to the document page', async ({ page }) => {
    const homePage = await loginAndOpenHome(page);
    await homePage.uploadPdfs([samplePdfPath, samplePdfPath2]);
    await homePage.startCollaboration();
    await homePage.expectRedirectedToDocumentPage();
  });
});
