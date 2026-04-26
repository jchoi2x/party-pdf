import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for the Dashboard page at `/dashboard`.
 * The document list is powered by AG Grid (server-side row model).
 */
export class DashboardPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly subheading: Locator;
  readonly refreshButton: Locator;
  readonly backHomeLink: Locator;
  readonly grid: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: /dashboard/i });
    this.subheading = page.getByText(/server-side infinite loading/i);
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.backHomeLink = page.getByRole('link', { name: /back home/i });
    this.grid = page.locator('.ag-root-wrapper');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectGridVisible(): Promise<void> {
    await expect(this.grid).toBeVisible();
  }

  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
  }

  async clickBackHome(): Promise<void> {
    await this.backHomeLink.click();
    await this.page.waitForURL('/');
  }
}
