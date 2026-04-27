import { expect, type Locator, type Page } from '@playwright/test';

export class HomePage {
  private readonly uploadInput: Locator;
  private readonly startCollaborationButton: Locator;
  private readonly setNameDialogTitle: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly saveAndContinueButton: Locator;

  constructor(private readonly page: Page) {
    this.uploadInput = this.page.locator('#pdf-upload');
    this.startCollaborationButton = this.page.getByRole('button', { name: /start collaboration/i });
    this.setNameDialogTitle = this.page.getByRole('heading', { name: /set your name/i });
    this.firstNameInput = this.page.getByPlaceholder('First name');
    this.lastNameInput = this.page.getByPlaceholder('Last name');
    this.saveAndContinueButton = this.page.getByRole('button', { name: /save and continue/i });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.uploadInput).toBeAttached();
    await expect(this.startCollaborationButton).toBeVisible();
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
    const count = filePaths.length;
    await expect(this.page.getByText(new RegExp(`${count} PDF file`))).toBeVisible();
  }

  async startCollaboration(): Promise<void> {
    await this.startCollaborationButton.click();
  }

  async expectRedirectedToDocumentPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/document\/[^/?#]+$/, { timeout: 120_000 });
  }
}
