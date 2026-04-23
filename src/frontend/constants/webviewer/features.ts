import type WebViewer from '@pdftron/webviewer';

type WebViewerInstance = Awaited<ReturnType<typeof WebViewer>>;

export type WebViewerFeatureName = keyof WebViewerInstance['UI']['Feature'];

export const WEBVIEWER_FEATURES_TO_DISABLE = [
  // 'InlineComment',
  // 'FilePicker',
  // 'Measurement',
  // 'TextSelection',
  // 'ThumbnailMerging',
  // 'ThumbnailReordering',
  // 'MathSymbols',
  // 'NotesPanelVirtualizedList',
  // 'NotesShowLastUpdatedDate',
  // 'Download',
  // 'NotesPanel',
  // 'Print',
] as const satisfies readonly WebViewerFeatureName[];

export const WEBVIEWER_FEATURES_TO_ENABLE = [
  // 'SavedSignaturesTab',
  // 'MultiTab',
  // 'ComparePages',
  // 'Initials',
] as const satisfies readonly WebViewerFeatureName[];
