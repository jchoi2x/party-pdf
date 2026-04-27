import { expect, type Page } from '@playwright/test';

export class DocumentPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/document\/[^/?#]+$/, { timeout: 120_000 });
    await expect(this.page.locator('body')).toContainText(/party-pdf|what's your name\?/i);
  }

  async completeNameDialogIfPresent(): Promise<void> {
    const nameDialogHeading = this.page.getByRole('heading', { name: /what's your name\?/i });
    if ((await nameDialogHeading.count()) === 0) {
      return;
    }

    await expect(nameDialogHeading).toBeVisible();
    await this.page.getByPlaceholder(/e\.g\./i).fill('E2E Viewer Tester');
    await this.page.getByRole('button', { name: /continue/i }).click();
    await expect(nameDialogHeading).toHaveCount(0, { timeout: 30_000 });
  }

  async expectWebViewerInstanceReady(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const globalWithViewer = window as typeof window & {
          instance?: { UI?: { setZoomLevel?: (level: number) => void } };
        };
        return typeof globalWithViewer.instance?.UI?.setZoomLevel === 'function';
      },
      { timeout: 90_000 },
    );
  }

  async zoomInAndGetLevels(): Promise<{ before: number; after: number }> {
    return await this.page.evaluate(() => {
      type ViewerInstance = {
        UI: {
          getZoomLevel?: () => number;
          setZoomLevel?: (level: number) => void;
        };
        Core: {
          documentViewer: {
            getZoomLevel?: () => number;
          };
        };
      };

      const globalWithViewer = window as typeof window & { instance?: ViewerInstance };
      const instance = globalWithViewer.instance;
      if (!instance) {
        throw new Error('WebViewer instance is not available on window.instance');
      }

      const getZoomLevel = () =>
        instance.UI.getZoomLevel?.() ?? instance.Core.documentViewer.getZoomLevel?.() ?? 1;

      const before = getZoomLevel();
      instance.UI.setZoomLevel?.(before + 0.25);
      const after = getZoomLevel();
      return { before, after };
    });
  }

  async setCurrentAnnotationUser(name: string): Promise<{ before: string; after: string }> {
    return await this.page.evaluate((nextName: string) => {
      type ViewerInstance = {
        Core: {
          annotationManager: {
            setCurrentUser: (value: string) => void;
            getCurrentUser?: () => string;
          };
        };
      };

      const globalWithViewer = window as typeof window & { instance?: ViewerInstance };
      const instance = globalWithViewer.instance;
      if (!instance) {
        throw new Error('WebViewer instance is not available on window.instance');
      }

      const before = instance.Core.annotationManager.getCurrentUser?.() ?? '';
      instance.Core.annotationManager.setCurrentUser(nextName);
      const after = instance.Core.annotationManager.getCurrentUser?.() ?? '';

      return { before, after };
    }, name);
  }
}
