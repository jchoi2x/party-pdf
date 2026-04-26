import { authTest as test, expect } from '../fixtures/test';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * All tests here require an authenticated session.
 * They are skipped automatically when E2E credentials are absent.
 */
test.describe('Dashboard page — authenticated', () => {
  test('renders the Dashboard heading', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.expectHeadingVisible();
  });

  test('renders the subheading about server-side loading', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.subheading).toBeVisible();
  });

  test('AG Grid root element is present in the DOM', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.expectGridVisible();
  });

  test('grid has expected column headers', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Wait for the AG Grid to mount
    await expect(dashboard.grid).toBeVisible({ timeout: 15_000 });

    const colHeaders = page.locator('.ag-header-cell-text');
    await expect(colHeaders.filter({ hasText: /filename/i })).toBeVisible();
    await expect(colHeaders.filter({ hasText: /status/i })).toBeVisible();
    await expect(colHeaders.filter({ hasText: /uploaded at/i })).toBeVisible();
    await expect(colHeaders.filter({ hasText: /session id/i })).toBeVisible();
  });

  test('Refresh button is visible and clickable', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.refreshButton).toBeVisible();
    // Clicking should not throw (even if grid is empty)
    await dashboard.clickRefresh();
  });

  test('"Back home" link navigates to /', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.clickBackHome();

    await expect(page).toHaveURL('/');
  });
});
