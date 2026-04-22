import type { RefObject } from 'react';

interface CursorOverlayProps {
  overlayRef: RefObject<HTMLDivElement | null>;
}

export default function CursorOverlay({ overlayRef }: CursorOverlayProps) {
  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 40,
      }}
    />
  );
}
