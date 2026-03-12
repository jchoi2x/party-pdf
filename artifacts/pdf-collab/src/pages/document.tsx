import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import WebViewer from "@pdftron/webviewer";
import YProvider from "y-partyserver/provider";
import * as Y from "yjs";
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

export type ConnectionStatus = "connecting" | "connected" | "disconnected";
export interface Collaborator {
  name: string;
  color: string;
  peerId?: string;
}

const API_BASE = "https://oblockparty.xvzf.workers.dev/api";

function applyWebViewerTheme(instance: Awaited<ReturnType<typeof WebViewer>>, dark: boolean) {
  const iframeWindow = instance.UI.iframeWindow;
  if (!iframeWindow) return;
  const style = iframeWindow.document.documentElement.style;
  if (dark) {
    // Base grays — mapped to our dark navy palette
    style.setProperty("--gray-1", "#0d1421");
    style.setProperty("--gray-2", "#131d30");
    style.setProperty("--gray-3", "#1a2640");
    style.setProperty("--gray-4", "#263348");
    style.setProperty("--gray-5", "#4a5870");
    style.setProperty("--gray-6", "#8a9ab8");
    style.setProperty("--gray-7", "#b0bed8");
    style.setProperty("--gray-8", "#ccd4e8");
    style.setProperty("--gray-9", "#d8e0f0");
    style.setProperty("--gray-10", "#e4eaf8");
    style.setProperty("--gray-11", "#edf0fa");
    style.setProperty("--gray-12", "#ffffff");
    // Blues — our primary accent (hsl 225 40% 65%)
    style.setProperty("--blue-1", "#0d1829");
    style.setProperty("--blue-2", "#111f38");
    style.setProperty("--blue-3", "#1a2e50");
    style.setProperty("--blue-4", "#1f3660");
    style.setProperty("--blue-5", "#3a5490");
    style.setProperty("--blue-6", "#7594d6");
  } else {
    // Remove overrides — let WebViewer use its built-in light defaults
    const vars = [
      "--gray-1","--gray-2","--gray-3","--gray-4","--gray-5",
      "--gray-6","--gray-7","--gray-8","--gray-9","--gray-10",
      "--gray-11","--gray-12",
      "--blue-1","--blue-2","--blue-3","--blue-4","--blue-5","--blue-6",
    ];
    vars.forEach((v) => style.removeProperty(v));
  }
}

const APRYSE_LICENSE =
  "demo:1773251044163:637ef9590300000000e0776822862dfcea1362e5ec2c24eef968e7609f";
const WEBVIEWER_CDN =
  "https://cdn.jsdelivr.net/npm/@pdftron/webviewer@11.11.0/public";
const PARTY_HOST = "oblockparty.xvzf.workers.dev";

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
          setupYjsCollaboration(annotationManager, id!);
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
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [id]);

  function setupYjsCollaboration(annotationManager: any, roomId: string) {
    try {
      const ydoc = new Y.Doc();

      const provider = new YProvider(PARTY_HOST, roomId, ydoc, {
        party: "room",
      });
      providerRef.current = provider;

      const annotationsMap = ydoc.getMap<string>("annotations");
      let isSyncing = false;

      annotationsMap.observe(async (event) => {
        if (isSyncing) return;
        if (event.transaction.origin === "local") return;

        for (const [key, change] of event.changes.keys) {
          try {
            isSyncing = true;
            if (change.action === "delete") {
              const deleteXfdf = `<?xml version="1.0" encoding="UTF-8" ?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><fields /><delete><id>${key}</id></delete></xfdf>`;
              await annotationManager.importAnnotationCommand(deleteXfdf);
            } else {
              const xfdf = annotationsMap.get(key);
              if (xfdf) {
                await annotationManager.importAnnotations(xfdf);
              }
            }
            isSyncing = false;
          } catch (e) {
            isSyncing = false;
            console.error("Failed to apply remote annotation:", e);
          }
        }
      });

      annotationManager.addEventListener(
        "annotationChanged",
        async (
          annotations: any[],
          action: string,
          { imported }: { imported: boolean },
        ) => {
          if (imported || isSyncing) return;
          try {
            for (const annotation of annotations) {
              const annotId = annotation.Id;
              if (!annotId) continue;

              if (action === "delete") {
                ydoc.transact(() => {
                  annotationsMap.delete(annotId);
                }, "local");
              } else {
                const xfdf = await annotationManager.exportAnnotations({
                  annotList: [annotation],
                  useDisplayAuthor: true,
                });
                ydoc.transact(() => {
                  annotationsMap.set(annotId, xfdf);
                }, "local");
              }
            }
          } catch (e) {
            console.error("Failed to sync annotation:", e);
          }
        },
      );

      const currentUser = getStoredUserName() || "Guest";
      const currentColor = getUserColor();
      provider.awareness.setLocalStateField("user", {
        name: currentUser,
        color: currentColor,
      });

      function updateCollaborators() {
        const states = provider.awareness.getStates();
        const localClientId = provider.awareness.clientID;
        const others: Collaborator[] = [];
        states.forEach((state: Record<string, unknown>, clientId: number) => {
          if (clientId === localClientId) return;
          const user = state.user as Record<string, unknown> | undefined;
          if (!user) return;
          const name =
            typeof user.name === "string" && user.name.trim()
              ? user.name.trim()
              : null;
          const color =
            typeof user.color === "string" && user.color
              ? user.color
              : "#90A4AE";
          const peerId =
            typeof user.peerId === "string" ? user.peerId : undefined;
          if (name) {
            others.push({ name, color, peerId });
          }
        });
        setCollaborators(others);
      }

      provider.awareness.on("change", updateCollaborators);

      const validStatuses = new Set<ConnectionStatus>([
        "connecting",
        "connected",
        "disconnected",
      ]);

      function handleStatus({ status }: { status: string }) {
        console.log(`[y-partyserver] Status: ${status} — room: ${roomId}`);
        if (validStatuses.has(status as ConnectionStatus)) {
          setConnectionStatus(status as ConnectionStatus);
        } else {
          setConnectionStatus("disconnected");
        }
      }

      provider.on("status", handleStatus);

      async function handleSynced(synced: boolean) {
        console.log(`[y-partyserver] Synced: ${synced} — room: ${roomId}`);
        if (synced) {
          try {
            isSyncing = true;
            for (const [, xfdf] of annotationsMap) {
              await annotationManager.importAnnotations(xfdf);
            }
            isSyncing = false;
          } catch (e) {
            isSyncing = false;
            console.error("Failed to load initial annotations:", e);
          }
        }
      }

      provider.on("synced", handleSynced);
    } catch (e) {
      console.warn("Real-time collaboration setup failed:", e);
      setConnectionStatus("disconnected");
    }
  }

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
          <div ref={viewerRef} className="w-full h-full" />
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
