import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for the Home (upload) page at `/`.
 *
 * Step 1 — Upload: user selects PDFs and starts the upload.
 * Step 2 — Invite: user adds participant emails or skips.
 */
export class HomePage {
  readonly page: Page;

  // ── Upload step ──────────────────────────────────────────────────────────
  readonly heading: Locator;
  readonly dropZone: Locator;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly fileTable: Locator;

  // ── Invite step ──────────────────────────────────────────────────────────
  readonly inviteEmailsTextarea: Locator;
  readonly skipInvitesButton: Locator;
  readonly reviewInvitesButton: Locator;
  readonly sessionIdText: Locator;

  // ── Confirm dialog ────────────────────────────────────────────────────────
  readonly confirmDialog: Locator;
  readonly confirmSubmitButton: Locator;
  readonly confirmCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: /party-pdf/i });
    this.dropZone = page.getByRole('button').filter({ hasText: /click or drop pdfs/i });
    this.fileInput = page.locator('input#pdf-upload');
    this.uploadButton = page.getByRole('button', { name: /upload files/i });
    this.fileTable = page.locator('table');

    this.inviteEmailsTextarea = page.locator('textarea#invite-emails');
    this.skipInvitesButton = page.getByRole('button', { name: /skip invites/i });
    this.reviewInvitesButton = page.getByRole('button', { name: /review and send invites/i });
    this.sessionIdText = page.locator('span.font-mono');

    this.confirmDialog = page.getByRole('dialog');
    this.confirmSubmitButton = page.getByRole('button', { name: /submit and open session/i });
    this.confirmCancelButton = page.getByRole('button', { name: /cancel/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** Upload a file via the hidden file input (bypasses OS dialog). */
  async uploadFile(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
  }

  /** Upload multiple files at once. */
  async uploadFiles(filePaths: string[]): Promise<void> {
    await this.fileInput.setInputFiles(filePaths);
  }

  async expectUploadStepVisible(): Promise<void> {
    await expect(this.uploadButton).toBeVisible();
    await expect(this.fileInput).toBeAttached();
  }

  async expectInviteStepVisible(): Promise<void> {
    await expect(this.inviteEmailsTextarea).toBeVisible();
    await expect(this.skipInvitesButton).toBeVisible();
    await expect(this.reviewInvitesButton).toBeVisible();
  }

  async expectFileInTable(filename: string): Promise<void> {
    await expect(this.fileTable.getByText(filename)).toBeVisible();
  }
}
