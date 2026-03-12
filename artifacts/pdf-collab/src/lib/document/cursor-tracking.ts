import type { MutableRefObject, RefObject } from "react";
import WebViewer from "@pdftron/webviewer";
import type YProvider from "y-partyserver/provider";
import type { CursorPosition, Collaborator } from "@/lib/document/types";

export function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "#90A4AE";
}

export function setupCursorTracking(
  instance: Awaited<ReturnType<typeof WebViewer>>,
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>,
  cursorCleanupRef: MutableRefObject<(() => void) | null>,
  updateOverlayFn: () => void,
) {
  const { documentViewer } = instance.Core;

  let lastBroadcast = 0;
  const THROTTLE_MS = 33;

  function handleMouseMove(e: { clientX: number; clientY: number }) {
    const now = Date.now();
    if (now - lastBroadcast < THROTTLE_MS) return;
    lastBroadcast = now;

    const provider = providerRef.current;
    if (!provider) return;

    try {
      const displayMode = documentViewer
        .getDisplayModeManager()
        .getDisplayMode();
      const scrollElement = documentViewer.getScrollViewElement();
      const scrollRect = scrollElement.getBoundingClientRect();
      const iframeEl = document.querySelector('apryse-webviewer') as HTMLElement | null;
      if (!iframeEl) return;
      const iframeRect = iframeEl.getBoundingClientRect();

      const iframeRelativeX = e.clientX - iframeRect.left;
      const iframeRelativeY = e.clientY - iframeRect.top;

      const windowPoint = new instance.Core.Math.Point(
        iframeRelativeX - scrollRect.left + scrollElement.scrollLeft,
        iframeRelativeY - scrollRect.top + scrollElement.scrollTop,
      );

      const selected = displayMode.getSelectedPages(windowPoint, windowPoint);
      const page = selected?.first || selected?.last || null;
      if (!page) {
        console.log("no page");
        broadcastCursor(null);
        return;
      }

      const pagePoint = displayMode.windowToPage(windowPoint, page);
      const cursor = {
        pageNumber: page,
        x: pagePoint.x,
        y: pagePoint.y,
      };
      console.log("cursor", cursor);
      broadcastCursor(cursor);
    } catch (err) {
      console.log("error", err);
      // ignore coordinate conversion errors
    }
  }

  function handleMouseLeave() {
    broadcastCursor(null);
  }

  function broadcastCursor(cursor: CursorPosition | null) {
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalStateField("cursor", cursor);
  }

  documentViewer.addEventListener("mouseMove", handleMouseMove);
  documentViewer.addEventListener("mouseLeave", handleMouseLeave);

  const scrollElement = documentViewer.getScrollViewElement();

  function handleScrollOrZoom() {
    updateOverlayFn();
  }

  scrollElement.addEventListener("scroll", handleScrollOrZoom);
  documentViewer.addEventListener("zoomUpdated", handleScrollOrZoom);

  cursorCleanupRef.current = () => {
    documentViewer.removeEventListener("mouseMove", handleMouseMove);
    documentViewer.removeEventListener("mouseLeave", handleMouseLeave);
    scrollElement.removeEventListener("scroll", handleScrollOrZoom);
    documentViewer.removeEventListener("zoomUpdated", handleScrollOrZoom);
    broadcastCursor(null);
  };
}

export function updateCursorOverlay(
  overlayRef: RefObject<HTMLDivElement | null>,
  viewerInstanceRef: MutableRefObject<Awaited<
    ReturnType<typeof WebViewer>
  > | null>,
  viewerRef: RefObject<HTMLDivElement | null>,
  collaboratorsRef: MutableRefObject<Collaborator[]>,
) {
  const overlay = overlayRef.current;
  const instance = viewerInstanceRef.current;
  if (!overlay || !instance) return;

  const collabs = collaboratorsRef.current;
  const { documentViewer } = instance.Core;

  while (overlay.firstChild) overlay.removeChild(overlay.firstChild);

  for (const collab of collabs) {
    if (!collab.cursor) continue;

    try {
      const displayMode = documentViewer
        .getDisplayModeManager()
        .getDisplayMode();
      const pagePoint = new instance.Core.Math.Point(
        collab.cursor.x,
        collab.cursor.y,
      );
      const windowPoint = displayMode.pageToWindow(
        pagePoint,
        collab.cursor.pageNumber,
      );

      const scrollElement = documentViewer.getScrollViewElement();
      const scrollRect = scrollElement.getBoundingClientRect();
      const iframeEl = document.querySelector('apryse-webviewer') as HTMLElement | null;
      if (!iframeEl) continue;
      const iframeRect = iframeEl.getBoundingClientRect();
      const viewerContainer = viewerRef.current;
      if (!viewerContainer) continue;
      const containerRect = viewerContainer.getBoundingClientRect();

      const screenX =
        windowPoint.x -
        scrollElement.scrollLeft +
        scrollRect.left +
        iframeRect.left -
        containerRect.left;
      const screenY =
        windowPoint.y -
        scrollElement.scrollTop +
        scrollRect.top +
        iframeRect.top -
        containerRect.top;

      if (
        screenX < 0 ||
        screenY < 0 ||
        screenX > containerRect.width ||
        screenY > containerRect.height
      )
        continue;

      const safeColor = sanitizeColor(collab.color);

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position:absolute;left:${screenX}px;top:${screenY}px;pointer-events:none;z-index:50;transition:left 0.05s linear,top 0.05s linear;`;

      const svgNs = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNs, "svg");
      svg.setAttribute("width", "16");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 16 20");
      svg.setAttribute("fill", "none");
      svg.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.3))";
      const path = document.createElementNS(svgNs, "path");
      path.setAttribute("d", "M0 0L16 12H6L4 20L0 0Z");
      path.setAttribute("fill", safeColor);
      path.setAttribute("stroke", "#fff");
      path.setAttribute("stroke-width", "1");
      svg.appendChild(path);
      wrapper.appendChild(svg);

      const label = document.createElement("span");
      label.textContent = collab.name;
      label.style.cssText = `position:absolute;left:14px;top:12px;background:${safeColor};color:#fff;font-size:11px;line-height:1;padding:2px 6px;border-radius:4px;white-space:nowrap;font-family:system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,0.2);`;
      wrapper.appendChild(label);

      overlay.appendChild(wrapper);
    } catch {
      // ignore rendering errors for individual cursors
    }
  }
}
