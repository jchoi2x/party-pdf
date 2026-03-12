import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { toast } from "sonner";
import WebViewer from "@pdftron/webviewer";
import YProvider from "y-partyserver/provider";
import { getDocument } from "@/lib/indexeddb";
import { getStoredUserName } from "@/lib/username";
import { applyWebViewerTheme } from "@/lib/document/theme";
import { setupYjsCollaboration } from "@/lib/document/collaboration";
import { setupCursorTracking } from "@/lib/document/cursor-tracking";
import type { ConnectionStatus, Collaborator } from "@/lib/document/types";

const API_BASE = "https://oblockparty.xvzf.workers.dev/api";
const APRYSE_LICENSE =
  "demo:1773251044163:637ef9590300000000e0776822862dfcea1362e5ec2c24eef968e7609f";
const WEBVIEWER_CDN =
  "https://cdn.jsdelivr.net/npm/@pdftron/webviewer@11.11.0/public";

interface UseWebViewerOptions {
  id: string;
  isDark: boolean;
  viewerRef: RefObject<HTMLDivElement | null>;
  viewerInstanceRef: MutableRefObject<Awaited<ReturnType<typeof WebViewer>> | null>;
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>;
  cursorCleanupRef: MutableRefObject<(() => void) | null>;
  doUpdateCursorOverlay: () => void;
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>;
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>;
  navigate: (path: string) => void;
}

export function useWebViewer({
  id,
  isDark,
  viewerRef,
  viewerInstanceRef,
  providerRef,
  cursorCleanupRef,
  doUpdateCursorOverlay,
  setConnectionStatus,
  setCollaborators,
  navigate,
}: UseWebViewerOptions) {
  const viewerInitialized = useRef(false);
  const [docName, setDocName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate("/");
      return;
    }

    async function init() {
      try {
        let docUrl: string | null = null;
        let localBlob: Blob | null = null;
        let name = "";

        const cached = sessionStorage.getItem(id);
        if (cached) {
          const parsed = JSON.parse(cached);
          docUrl = parsed.downloadUrl;
          name = parsed.name;
        } else {
          try {
            const res = await fetch(`${API_BASE}/download-url/${id}`);
            if (!res.ok) throw new Error("Failed to fetch download URL");
            const data = await res.json();
            docUrl = data.url;
            name = "Shared Document";
          } catch (cloudErr) {
            console.warn("Cloud download failed, trying local fallback:", cloudErr);
            const localDoc = await getDocument(id);
            if (!localDoc) {
              toast.error("Document not found. Please upload the PDF again.");
              navigate("/");
              return;
            }
            localBlob = localDoc.blob;
            name = localDoc.name;
          }
        }

        setDocName(name);

        if (!viewerRef.current || viewerInitialized.current) return;
        viewerInitialized.current = true;

        const instance = await WebViewer(
          {
            path: WEBVIEWER_CDN,
            licenseKey: APRYSE_LICENSE,
            ...(docUrl ? { initialDoc: docUrl } : {}),
          },
          viewerRef.current,
        );

        viewerInstanceRef.current = instance;
        (window as any).instance = instance;

        instance.UI.disableElements(["toolbarGroup-Edit"]);
        instance.UI.setTheme(
          isDark ? instance.UI.Theme.DARK : instance.UI.Theme.LIGHT,
        );
        instance.UI.addEventListener("viewerLoaded", () =>
          applyWebViewerTheme(instance, isDark),
        );

        const { documentViewer, annotationManager } = instance.Core;
        annotationManager.setCurrentUser(getStoredUserName() || "Guest");

        documentViewer.addEventListener("documentLoaded", () => {
          setIsLoading(false);
          setupYjsCollaboration(
            annotationManager,
            id,
            providerRef,
            setCollaborators,
            setConnectionStatus,
          );
          setupCursorTracking(
            instance,
            providerRef,
            cursorCleanupRef,
            doUpdateCursorOverlay,
          );
        });

        if (localBlob) {
          instance.UI.loadDocument(localBlob, { filename: name });
        }
      } catch (err) {
        console.error("WebViewer initialization failed:", err);
        toast.error("Failed to load document. Please try again.");
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (cursorCleanupRef.current) {
        cursorCleanupRef.current();
        cursorCleanupRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [id]);

  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (instance) {
      instance.UI.setTheme(
        isDark ? instance.UI.Theme.DARK : instance.UI.Theme.LIGHT,
      );
      applyWebViewerTheme(instance, isDark);
    }
  }, [isDark]);

  return { docName, isLoading };
}
