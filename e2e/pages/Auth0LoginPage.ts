import { expect, type Locator, type Page } from '@playwright/test';

export class Auth0LoginPage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly continueButton: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = this.page.locator(
      'input[type="email"], input[name="username"], input[name="email"], input#username, input#email',
    );
    this.passwordInput = this.page.locator('input[type="password"]');
    this.continueButton = this.page.getByRole('button', { name: /continue|next/i });
    this.submitButton = this.page.getByRole('button', { name: /log in|login|sign in|continue/i });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/auth0\.com/);
    await expect(this.emailInput.first()).toBeVisible({ timeout: 15_000 });
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.first().fill(email);

    if (await this.passwordInput.first().isVisible().catch(() => false)) {
      await this.passwordInput.first().fill(password);
      await this.submitButton.first().click();
      return;
    }

    if (await this.continueButton.first().isVisible().catch(() => false)) {
      await this.continueButton.first().click();
    } else {
      await this.submitButton.first().click();
    }

    await expect(this.passwordInput.first()).toBeVisible({ timeout: 15_000 });
    await this.passwordInput.first().fill(password);
    await this.submitButton.first().click();
  }
}
