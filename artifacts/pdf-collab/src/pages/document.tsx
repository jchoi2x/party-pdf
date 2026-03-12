import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import WebViewer from "@pdftron/webviewer";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import PartySocket from "partysocket";
import { getDocument } from "@/lib/indexeddb";
import { getStoredUserName } from "@/lib/username";
import NameDialog from "@/components/NameDialog";
import DocumentHeader from "@/components/DocumentHeader";

const APRYSE_LICENSE = "demo:1773251044163:637ef9590300000000e0776822862dfcea1362e5ec2c24eef968e7609f";
const WEBVIEWER_CDN = "https://cdn.jsdelivr.net/npm/@pdftron/webviewer@11.11.0/public";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const viewerRef = useRef<HTMLDivElement>(null);
  const [docName, setDocName] = useState("");
  const [userName, setUserName] = useState<string | null>(getStoredUserName());
  const [showNameDialog, setShowNameDialog] = useState(!getStoredUserName());
  const [isLoading, setIsLoading] = useState(true);
  const viewerInstanceRef = useRef<Awaited<ReturnType<typeof WebViewer>> | null>(null);
  const viewerInitialized = useRef(false);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/");
      return;
    }

    let blobUrl: string | null = null;

    async function init() {
      try {
        const doc = await getDocument(id!);
        if (!doc) {
          toast.error("Document not found. Please upload the PDF again.");
          navigate("/");
          return;
        }

        setDocName(doc.name);
        blobUrl = URL.createObjectURL(doc.blob);

        if (!viewerRef.current || viewerInitialized.current) return;
        viewerInitialized.current = true;

        const instance = await WebViewer(
          {
            path: WEBVIEWER_CDN,
            licenseKey: APRYSE_LICENSE,
            initialDoc: blobUrl,
          },
          viewerRef.current
        );

        viewerInstanceRef.current = instance;

        const { documentViewer, annotationManager } = instance.Core;

        const currentUser = getStoredUserName() || "Guest";
        annotationManager.setCurrentUser(currentUser);

        documentViewer.addEventListener("documentLoaded", () => {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
          }
          setIsLoading(false);
          setupYjsCollaboration(annotationManager, id!);
        });
      } catch (err) {
        console.error("WebViewer initialization failed:", err);
        toast.error("Failed to load document viewer. Please try again.");
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [id]);

  function setupYjsCollaboration(annotationManager: any, roomId: string) {
    try {
      const ydoc = new Y.Doc();

      const host = window.location.host;
      const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${host}/yjs`;

      const wsProvider = new WebsocketProvider(wsUrl, roomId, ydoc, {
        WebSocketPolyfill: PartySocket as any,
      });
      providerRef.current = wsProvider;

      const annotationsMap = ydoc.getMap<string>("annotations");
      const currentUser = getStoredUserName() || "Guest";

      let isSyncing = false;

      annotationsMap.observe(async (event) => {
        if (isSyncing) return;
        for (const [key, xfdf] of event.changes.keys) {
          if (event.transaction.origin === "local") continue;
          try {
            isSyncing = true;
            if (xfdf !== null) {
              await annotationManager.importAnnotationCommand(annotationsMap.get(key));
            }
            isSyncing = false;
          } catch (e) {
            isSyncing = false;
            console.error("Failed to apply remote annotation:", e);
          }
        }
      });

      annotationManager.addEventListener("annotationChanged", async (annotations: any[], action: string, { imported }: { imported: boolean }) => {
        if (imported || isSyncing) return;
        try {
          const xfdf = await annotationManager.exportAnnotationCommand();
          isSyncing = true;
          ydoc.transact(() => {
            annotationsMap.set("update", xfdf);
          }, "local");
          isSyncing = false;
        } catch (e) {
          isSyncing = false;
          console.error("Failed to sync annotation:", e);
        }
      });

      wsProvider.on("status", ({ status }: { status: string }) => {
        console.log(`[y-websocket] Status: ${status} for room: ${roomId}`);
      });
    } catch (e) {
      console.warn("Real-time collaboration setup failed:", e);
    }
  }

  function handleNameSave(name: string) {
    setUserName(name);
    setShowNameDialog(false);
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.Core.annotationManager.setCurrentUser(name);
    }
  }

  function handleUserNameChange(name: string) {
    setUserName(name);
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.Core.annotationManager.setCurrentUser(name);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <NameDialog open={showNameDialog} onSave={handleNameSave} />

      {!showNameDialog && (
        <DocumentHeader
          documentName={docName || "Loading..."}
          userName={userName || ""}
          onUserNameChange={handleUserNameChange}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          </div>
        )}
        <div ref={viewerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
