import type WebViewer from '@pdftron/webviewer';

export type WebViewerConstructorOptions = Parameters<typeof WebViewer>[0];

const APRYSE_LICENSE = import.meta.env.APRYSE_LICENSE as string;
const WEBVIEWER_CDN = import.meta.env.WEBVIEWER_CDN as string;

export function getWebViewerConstructorOptions(initialDoc?: string | null): WebViewerConstructorOptions {
  return {
    path: WEBVIEWER_CDN,
    licenseKey: APRYSE_LICENSE,
    ...(initialDoc ? { initialDoc } : {}),
  };
}
