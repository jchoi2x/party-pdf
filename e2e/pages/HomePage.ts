import { expect, type Locator, type Page } from '@playwright/test';

export class HomePage {
  private readonly uploadInput: Locator;
  private readonly uploadAndContinueButton: Locator;
  private readonly skipToSessionButton: Locator;
  private readonly setNameDialogTitle: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly saveAndContinueButton: Locator;

  constructor(private readonly page: Page) {
    this.uploadInput = this.page.locator('#pdf-upload');
    this.uploadAndContinueButton = this.page.getByRole('button', { name: /upload & continue/i });
    this.skipToSessionButton = this.page.getByRole('button', { name: /skip.*open session only/i });
    this.setNameDialogTitle = this.page.getByRole('heading', { name: /set your name/i });
    this.firstNameInput = this.page.getByPlaceholder('First name');
    this.lastNameInput = this.page.getByPlaceholder('Last name');
    this.saveAndContinueButton = this.page.getByRole('button', { name: /save and continue/i });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.uploadInput).toBeAttached();
    await expect(this.uploadAndContinueButton).toBeVisible();
  }

  async completeProfilePromptIfPresent(): Promise<void> {
    if ((await this.setNameDialogTitle.count()) === 0) {
      return;
    }

    await expect(this.setNameDialogTitle).toBeVisible();
    await this.firstNameInput.fill('Test');
    await this.lastNameInput.fill('User');
    await this.saveAndContinueButton.click();

    await expect(this.setNameDialogTitle).toHaveCount(0, { timeout: 30_000 });
    await this.expectLoaded();
  }

  async uploadPdf(filePath: string): Promise<void> {
    await this.uploadPdfs([filePath]);
  }

  async uploadPdfs(filePaths: string[]): Promise<void> {
    await this.uploadInput.setInputFiles(filePaths);
    await expect(this.uploadAndContinueButton).toBeEnabled();
  }

  async startCollaboration(): Promise<void> {
    await this.uploadAndContinueButton.click();
    await expect(this.skipToSessionButton).toBeVisible({ timeout: 30_000 });
    await this.skipToSessionButton.click();
  }

  async expectRedirectedToDocumentPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/document\/[^/?#]+$/, { timeout: 120_000 });
  }
}
