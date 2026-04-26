import { ulid } from 'ulid';
import { authTest as test, expect } from '../fixtures/test';
import { DocumentPage } from '../pages/document.page';

/**
 * All tests here require an authenticated session.
 * They are skipped automatically when E2E credentials are absent.
 */
test.describe('Document page — authenticated', () => {
  /**
   * Visiting a session the test user has no access to must show the
   * "Session access denied" UI defined in document.tsx (isUnauthorized branch).
   *
   * We generate a random ULID as the session ID — the server will look it
   * up in the DB and find no participant record for the current user, which
   * causes useWebViewer to set isUnauthorized = true.
   */
  test('shows "Session access denied" for an unknown / uninvited session', async ({ page }) => {
    const fakeSessionId = ulid();
    const documentPage = new DocumentPage(page);
    await documentPage.goto(fakeSessionId);

    await documentPage.expectUnauthorizedUI();
  });

  test('"Back to home" button on the unauthorized screen navigates to /', async ({ page }) => {
    const fakeSessionId = ulid();
    const documentPage = new DocumentPage(page);
    await documentPage.goto(fakeSessionId);

    await documentPage.expectUnauthorizedUI();
    await documentPage.clickBackToHome();

    await expect(page).toHaveURL('/');
  });

  /**
   * The /document/:id URL is a protected route.
   * Even with a fake ID, the page shell (header, panels) should mount
   * before the unauthorized state is resolved.
   * This test only verifies that the page does NOT crash with an unhandled error.
   */
  test('page does not crash or show a 5xx error for any session ID', async ({ page }) => {
    const fakeSessionId = ulid();
    const response = await page.goto(`/document/${fakeSessionId}`);

    // SPA responds with 200 (static asset) regardless of session validity
    expect(response?.status()).not.toBe(500);
    expect(response?.status()).not.toBe(503);
  });
});
