import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for the Document (collaboration) page at `/document/:collabSessionId`.
 */
export class DocumentPage {
  readonly page: Page;

  // ── Unauthorized state ─────────────────────────────────────────────────
  readonly unauthorizedHeading: Locator;
  readonly unauthorizedDescription: Locator;
  readonly backToHomeButton: Locator;

  // ── Authorized / loading state ─────────────────────────────────────────
  readonly documentHeaderRegion: Locator;
  readonly documentPanel: Locator;

  constructor(page: Page) {
    this.page = page;

    this.unauthorizedHeading = page.getByRole('heading', { name: /session access denied/i });
    this.unauthorizedDescription = page.getByText(/not listed as a participant/i);
    this.backToHomeButton = page.getByRole('button', { name: /back to home/i });

    this.documentHeaderRegion = page.locator('header, [data-testid="document-header"]').first();
    this.documentPanel = page.locator('[data-testid="document-panel"], .webviewer').first();
  }

  async goto(collabSessionId: string): Promise<void> {
    await this.page.goto(`/document/${collabSessionId}`);
  }

  async expectUnauthorizedUI(): Promise<void> {
    await expect(this.unauthorizedHeading).toBeVisible({ timeout: 20_000 });
    await expect(this.unauthorizedDescription).toBeVisible();
    await expect(this.backToHomeButton).toBeVisible();
  }

  async clickBackToHome(): Promise<void> {
    await this.backToHomeButton.click();
    await this.page.waitForURL('/');
  }
}
