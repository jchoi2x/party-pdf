import { expect, type Page } from '@playwright/test';
import { appOrAuthRegex } from '../support/environment';

export class AppShellPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async expectAtAppOrAuth(): Promise<void> {
    await expect.poll(() => this.page.url()).toMatch(appOrAuthRegex);
  }

  isOnAuth0(): boolean {
    return this.page.url().includes('auth0.com');
  }

  async expectAuthPageOrErrorMessage(): Promise<void> {
    await expect(this.page.locator('body')).toContainText(/callback url mismatch|sign in|log in|authorize/i);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/PDF Collaboration/);
    await expect(this.page.locator('#root')).toContainText(
      /Auth0 is not configured|Checking session|Redirecting to login|Authentication failed|Party-PDF/,
    );
  }
}
