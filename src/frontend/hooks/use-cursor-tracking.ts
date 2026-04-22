import type WebViewer from '@pdftron/webviewer';
import type { MutableRefObject, RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { updateCursorOverlay } from '@/lib/document/cursor-tracking';
import type { Collaborator } from '@/lib/document/types';

export function useCursorTracking(
  collaborators: Collaborator[],
  viewerInstanceRef: MutableRefObject<Awaited<ReturnType<typeof WebViewer>> | null>,
  viewerRef: RefObject<HTMLDivElement | null>,
) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const collaboratorsRef = useRef<Collaborator[]>(collaborators);
  const cursorCleanupRef = useRef<(() => void) | null>(null);

  const doUpdateCursorOverlay = useCallback(() => {
    updateCursorOverlay(overlayRef, viewerInstanceRef, viewerRef, collaboratorsRef);
  }, [viewerInstanceRef, viewerRef]);

  useEffect(() => {
    collaboratorsRef.current = collaborators;
    doUpdateCursorOverlay();
  }, [collaborators, doUpdateCursorOverlay]);

  return { overlayRef, cursorCleanupRef, doUpdateCursorOverlay };
}
