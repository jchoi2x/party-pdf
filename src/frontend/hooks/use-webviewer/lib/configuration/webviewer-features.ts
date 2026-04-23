import type WebViewer from '@pdftron/webviewer';
import {
  WEBVIEWER_FEATURES_TO_DISABLE,
  WEBVIEWER_FEATURES_TO_ENABLE,
} from '@/constants/webviewer/features';

type WebViewerInstance = Awaited<ReturnType<typeof WebViewer>>;

export function applyWebViewerFeatureToggles(instance: WebViewerInstance): void {
  const { UI } = instance;
  UI.disableFeatures(WEBVIEWER_FEATURES_TO_DISABLE.map((name) => UI.Feature[name]));
  UI.enableFeatures(WEBVIEWER_FEATURES_TO_ENABLE.map((name) => UI.Feature[name]));
}
