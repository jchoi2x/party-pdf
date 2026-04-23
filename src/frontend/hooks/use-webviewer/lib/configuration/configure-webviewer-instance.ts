import type WebViewer from '@pdftron/webviewer';
import { applyWebViewerTheme } from '@/lib/document/theme';
import { applyWebViewerFeatureToggles } from './webviewer-features';

export type WebViewerInstance = Awaited<ReturnType<typeof WebViewer>>;

export function configureWebViewerInstance(instance: WebViewerInstance, isDark: boolean): void {
  applyWebViewerFeatureToggles(instance);
  // instance.UI.disableElements(['toolbarGroup-Edit']);
  instance.UI.setTheme(isDark ? instance.UI.Theme.DARK : instance.UI.Theme.LIGHT);
  instance.UI.addEventListener('viewerLoaded', () => applyWebViewerTheme(instance, isDark));
}
