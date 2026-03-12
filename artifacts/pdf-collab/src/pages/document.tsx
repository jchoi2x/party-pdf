import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import WebViewer from "@pdftron/webviewer";
import YProvider from "y-partyserver/provider";
import { getDocument } from "@/lib/indexeddb";
import { getStoredUserName, getUserColor, getInitials } from "@/lib/username";
import { useTheme } from "@/lib/theme";
import { useWebRTC } from "@/hooks/use-webrtc";
import { getStoredDevicePreferences } from "@/hooks/use-media-devices";
import NameDialog from "@/components/logical-units/NameDialog";
import DocumentHeader from "@/components/logical-units/DocumentHeader";
import VideoPanel from "@/components/logical-units/VideoPanel";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyWebViewerTheme } from "@/lib/document/theme";
import { setupCursorTracking, updateCursorOverlay } from "@/lib/document/cursor-tracking";
import { setupYjsCollaboration } from "@/lib/document/collaboration";
import type { ConnectionStatus, Collaborator } from "@/lib/document/types";
export type { ConnectionStatus, CursorPosition, Collaborator } from "@/lib/document/types";

const API_BASE = "https://oblockparty.xvzf.workers.dev/api";

const APRYSE_LICENSE =
  "demo:1773251044163:637ef9590300000000e0776822862dfcea1362e5ec2c24eef968e7609f";
const WEBVIEWER_CDN =
  "https://cdn.jsdelivr.net/npm/@pdftron/webviewer@11.11.0/public";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const viewerRef = useRef<HTMLDivElement>(null);
  const [docName, setDocName] = useState("");
  const [userName, setUserName] = useState<string | null>(getStoredUserName());
  const [showNameDialog, setShowNameDialog] = useState(!getStoredUserName());
  const [isLoading, setIsLoading] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [showConnectingModal, setShowConnectingModal] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const viewerInstanceRef = useRef<Awaited<
    ReturnType<typeof WebViewer>
  > | null>(null);
  const viewerInitialized = useRef(false);
  const providerRef = useRef<InstanceType<typeof YProvider> | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [videoPanelCollapsed, setVideoPanelCollapsed] = useState(false);
  const [signalConnected, setSignalConnected] = useState(false);
  const [mobileVideoOpen, setMobileVideoOpen] = useState(false);
  const isMobile = useIsMobile();
  const [audioOutputId, setAudioOutputId] = useState(() => getStoredDevicePreferences().audioOutput || "");

  const { localStream, remoteStreams, startCamera, stopCamera, replaceLocalStream, localPeerId } = useWebRTC(id, signalConnected);

  const handleReplaceStream = useCallback(async (newStream: MediaStream, outputId: string) => {
    setSignalConnected(true);
    await replaceLocalStream(newStream);
    setCameraOn(true);
    setAudioOutputId(outputId);
  }, [replaceLocalStream]);

  const handleToggleCamera = useCallback(async () => {
    if (cameraOn) {
      stopCamera();
      setCameraOn(false);
    } else {
      setSignalConnected(true);
      const prefs = getStoredDevicePreferences();
      const success = await startCamera({
        videoDeviceId: prefs.videoInput,
        audioDeviceId: prefs.audioInput,
      });
      if (success) {
        setCameraOn(true);
      } else {
        toast.error("Could not access camera. Check permissions and try again.");
      }
    }
  }, [cameraOn, startCamera, stopCamera]);

  const cursorCleanupRef = useRef<(() => void) | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const collaboratorsRef = useRef<Collaborator[]>([]);

  const doUpdateCursorOverlay = useCallback(() => {
    updateCursorOverlay(overlayRef, viewerInstanceRef, viewerRef, collaboratorsRef);
  }, []);

  useEffect(() => {
    collaboratorsRef.current = collaborators;
    doUpdateCursorOverlay();
  }, [collaborators, doUpdateCursorOverlay]);

  useEffect(() => {
    if (!id) {
      navigate("/");
      return;
    }

    async function init() {
      try {
        let docUrl: string | null = null;
        let localBlob: Blob | null = null;
        let name: string;

        const cached = sessionStorage.getItem(id!);
        if (cached) {
          const parsed = JSON.parse(cached);
          docUrl = parsed.downloadUrl;
          name = parsed.name;
        } else {
          try {
            const res = await fetch(`${API_BASE}/download-url/${id}`);
            if (!res.ok) {
              throw new Error("Failed to fetch download URL");
            }
            const data = await res.json();
            docUrl = data.url;
            name = "Shared Document";
          } catch (cloudErr) {
            console.warn(
              "Cloud download failed, trying local fallback:",
              cloudErr,
            );
            const localDoc = await getDocument(id!);
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

        instance.UI.disableElements(['toolbarGroup-Edit']);

        instance.UI.setTheme(
          isDark ? instance.UI.Theme.DARK : instance.UI.Theme.LIGHT,
        );

        instance.UI.addEventListener("viewerLoaded", () => {
          applyWebViewerTheme(instance, isDark);
        });

        const { documentViewer, annotationManager } = instance.Core;

        const currentUser = getStoredUserName() || "Guest";
        annotationManager.setCurrentUser(currentUser);

        documentViewer.addEventListener("documentLoaded", () => {
          setIsLoading(false);
          setupYjsCollaboration(annotationManager, id!, providerRef, setCollaborators, setConnectionStatus);
          setupCursorTracking(instance, providerRef, cursorCleanupRef, doUpdateCursorOverlay);
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
    if (providerRef.current && localPeerId) {
      const currentState = providerRef.current.awareness.getLocalState();
      const user = currentState?.user as Record<string, unknown> | undefined;
      if (user) {
        providerRef.current.awareness.setLocalStateField("user", {
          ...user,
          peerId: localPeerId,
        });
      }
    }
  }, [localPeerId]);

  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (instance) {
      instance.UI.setTheme(
        isDark ? instance.UI.Theme.DARK : instance.UI.Theme.LIGHT,
      );
      applyWebViewerTheme(instance, isDark);
    }
  }, [isDark]);

  // Show a "slow connection" modal only after a 4 s grace period while still
  // connecting post-load — fast connects never trigger it. Disconnections show
  // their own modal immediately (handled in the JSX below).
  useEffect(() => {
    if (isLoading || connectionStatus !== "connecting") {
      setShowConnectingModal(false);
      return;
    }
    const timer = setTimeout(() => setShowConnectingModal(true), 4000);
    return () => clearTimeout(timer);
  }, [isLoading, connectionStatus]);

  function handleNameSave(name: string) {
    setUserName(name);
    setShowNameDialog(false);
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.Core.annotationManager.setCurrentUser(name);
    }
    if (providerRef.current) {
      const existing = providerRef.current.awareness.getLocalState()?.user as Record<string, unknown> | undefined;
      providerRef.current.awareness.setLocalStateField("user", {
        ...existing,
        name,
        color: getUserColor(),
      });
    }
  }

  function handleUserNameChange(name: string) {
    setUserName(name);
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.Core.annotationManager.setCurrentUser(name);
    }
    if (providerRef.current) {
      const existing = providerRef.current.awareness.getLocalState()?.user as Record<string, unknown> | undefined;
      providerRef.current.awareness.setLocalStateField("user", {
        ...existing,
        name,
        color: getUserColor(),
      });
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
          isDark={isDark}
          onToggleTheme={toggleTheme}
          collaborators={collaborators}
          isMobile={isMobile}
          onMobileVideoToggle={() => setMobileVideoOpen(true)}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {!isMobile && (
          <VideoPanel
            localStream={localStream}
            remoteStreams={remoteStreams}
            cameraOn={cameraOn}
            onToggleCamera={handleToggleCamera}
            collapsed={videoPanelCollapsed}
            onToggleCollapse={() => setVideoPanelCollapsed((v) => !v)}
            collaborators={collaborators}
            localUser={{ name: userName || "You", color: getUserColor() }}
            onReplaceStream={handleReplaceStream}
            audioOutputId={audioOutputId}
            connectionStatus={connectionStatus}
          />
        )}
        <div className="flex-1 relative overflow-hidden">
          {isLoading && <LoadingSpinner message="Loading document..." />}
          {/* Slow-connect modal — only shown after 4 s grace period */}
          {showConnectingModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-xl shadow-xl px-8 py-7 flex flex-col items-center gap-3 max-w-sm mx-4 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
                <p className="font-semibold text-foreground text-base">Connecting…</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This is taking longer than expected. Waiting for the collaboration server to respond.
                </p>
                <div className="flex gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                </div>
              </div>
            </div>
          )}
          {/* Disconnected modal — shown immediately */}
          {!isLoading && connectionStatus === "disconnected" && (
            <div className="absolute inset-0 z-50 flex item s-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-xl shadow-xl px-8 py-7 flex flex-col items-center gap-3 max-w-sm mx-4 text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <p className="font-semibold text-foreground text-base">Connection isn't stable</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Lost connection to the collaboration server. Attempting to reconnect…
                </p>
                <div className="flex gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={viewerRef} className="w-full h-full" />
          <div
            ref={overlayRef}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              overflow: "hidden",
              zIndex: 40,
            }}
          />
        </div>
      </div>

      {isMobile && (
        <VideoPanel
          localStream={localStream}
          remoteStreams={remoteStreams}
          cameraOn={cameraOn}
          onToggleCamera={handleToggleCamera}
          collapsed={false}
          onToggleCollapse={() => {}}
          isMobile
          mobileOpen={mobileVideoOpen}
          onMobileClose={() => setMobileVideoOpen(false)}
          collaborators={collaborators}
          localUser={{ name: userName || "You", color: getUserColor() }}
          onReplaceStream={handleReplaceStream}
          audioOutputId={audioOutputId}
          connectionStatus={connectionStatus}
        />
      )}
    </div>
  );
}
