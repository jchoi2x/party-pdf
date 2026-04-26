import path from 'node:path';
import { expect } from '@playwright/test';
import { authTest, test } from '../fixtures/test';
import { HomePage } from '../pages/home.page';

const MINIMAL_PDF = path.resolve('e2e/fixtures/minimal.pdf');

// ── Unauthenticated ───────────────────────────────────────────────────────────

test.describe('Home page — unauthenticated', () => {
  test('page responds and HTML is served', async ({ page }) => {
    const response = await page.goto('/');
    // App shell responds (may redirect to Auth0 login)
    expect(response?.status()).toBeLessThan(500);
  });

  test('page title is set', async ({ page }) => {
    await page.goto('/');
    // Title comes from index.html; just verify it is non-empty
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

// ── Authenticated ─────────────────────────────────────────────────────────────

authTest.describe('Home page — authenticated', () => {
  authTest('renders the upload card with "Party-PDF" heading', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.heading).toBeVisible({ timeout: 20_000 });
  });

  authTest('upload step is visible by default', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.expectUploadStepVisible();
  });

  authTest('drop-zone renders upload prompt text', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(page.getByText(/click or drop pdfs to add files/i)).toBeVisible();
  });

  authTest('upload button is disabled before any file is selected', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Button disabled when no files queued
    await expect(home.uploadButton).toBeDisabled();
  });

  authTest('selecting a PDF file adds it to the queue table', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.uploadFile(MINIMAL_PDF);

    await home.expectFileInTable('minimal.pdf');
    // Upload button becomes enabled once a file is in the queue
    await expect(home.uploadButton).toBeEnabled();
  });

  authTest('selecting a non-PDF file shows an error toast', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Inject a plain-text file that the app should reject
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input#pdf-upload');
      if (!input) return;
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.getByText(/only pdf files can be added/i)).toBeVisible({ timeout: 8_000 });
  });

  authTest('removing a file from the queue works', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.uploadFile(MINIMAL_PDF);
    await home.expectFileInTable('minimal.pdf');

    // Click the remove button for the file row
    await page.getByRole('button', { name: /remove minimal\.pdf/i }).click();

    // Table should no longer be rendered (no files)
    await expect(home.fileTable).not.toBeVisible();
    await expect(home.uploadButton).toBeDisabled();
  });

  authTest('multiple PDF files can be added at once', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Playwright setInputFiles accepts an array
    await home.uploadFiles([MINIMAL_PDF, MINIMAL_PDF]);

    // Even though we added the same file twice, only one unique entry appears
    // because home.tsx deduplicates by file id (name + size + lastModified)
    await expect(home.fileTable).toBeVisible();
  });
});
