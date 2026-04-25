import type WebViewer from '@pdftron/webviewer';
import { variables } from '@/constants/vars';

export type WebViewerConstructorOptions = Parameters<typeof WebViewer>[0];

export function getWebViewerConstructorOptions(initialDoc?: string | string[] | null): WebViewerConstructorOptions {
  const hasMultipleDocs = Array.isArray(initialDoc) && initialDoc.length > 1;
  return {
    path: variables.webviewerCdn,
    licenseKey: variables.apryseLicense,
    ...(initialDoc
      ? {
          // WebViewer supports string[] for MultiTab at runtime, but current SDK
          // type definitions still constrain initialDoc to string.
          initialDoc: initialDoc as unknown as string,
        }
      : {}),
    ...(hasMultipleDocs ? { extension: 'pdf' } : {}),
  };
}
