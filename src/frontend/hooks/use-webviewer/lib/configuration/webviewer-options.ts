import type WebViewer from '@pdftron/webviewer';
import { variables } from '@/constants/vars';

export type WebViewerConstructorOptions = Parameters<typeof WebViewer>[0];

export function getWebViewerConstructorOptions(initialDoc?: string | null): WebViewerConstructorOptions {
  return {
    path: variables.webviewerCdn,
    licenseKey: variables.apryseLicense,

    ...(initialDoc ? { initialDoc } : {}),
  };
}
