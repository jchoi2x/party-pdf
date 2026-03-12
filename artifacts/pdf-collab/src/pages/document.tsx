import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import WebViewer from "@pdftron/webviewer";
import YProvider from "y-partyserver/provider";
import * as Y from "yjs";
import { getDocument } from "@/lib/indexeddb";
import { getStoredUserName } from "@/lib/username";
import NameDialog from "@/components/logical-units/NameDialog";
import DocumentHeader from "@/components/logical-units/DocumentHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const APRYSE_LICENSE = "demo:1773251044163:637ef9590300000000e0776822862dfcea1362e5ec2c24eef968e7609f";
const WEBVIEWER_CDN = "https://cdn.jsdelivr.net/npm/@pdftron/webviewer@11.11.0/public";
const PARTY_HOST = "oblockparty.xvzf.workers.dev";

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
  const providerRef = useRef<InstanceType<typeof YProvider> | null>(null);

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

      const provider = new YProvider(PARTY_HOST, roomId, ydoc);
      providerRef.current = provider;

      const annotationsMap = ydoc.getMap<string>("annotations");
      let isSyncing = false;

      annotationsMap.observe(async (event) => {
        if (isSyncing) return;
        for (const [key] of event.changes.keys) {
          if (event.transaction.origin === "local") continue;
          const xfdf = annotationsMap.get(key);
          if (!xfdf) continue;
          try {
            isSyncing = true;
            await annotationManager.importAnnotationCommand(xfdf);
            isSyncing = false;
          } catch (e) {
            isSyncing = false;
            console.error("Failed to apply remote annotation:", e);
          }
        }
      });

      annotationManager.addEventListener(
        "annotationChanged",
        async (_annotations: any[], _action: string, { imported }: { imported: boolean }) => {
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
        }
      );

      provider.on("status", ({ status }: { status: string }) => {
        console.log(`[y-partyserver] Status: ${status} — room: ${roomId}`);
      });

      provider.on("synced", (synced: boolean) => {
        console.log(`[y-partyserver] Synced: ${synced} — room: ${roomId}`);
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
        {isLoading && <LoadingSpinner message="Loading document..." />}
        <div ref={viewerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
