import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import WebViewer from "@pdftron/webviewer";
import YProvider from "y-partyserver/provider";
import { getStoredUserName, getUserColor } from "@/lib/username";
import { useTheme } from "@/lib/theme";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useWebViewer } from "@/hooks/use-webviewer";
import { useCursorTracking } from "@/hooks/use-cursor-tracking";
import { getStoredDevicePreferences } from "@/hooks/use-media-devices";
import { useIsMobile } from "@/hooks/use-mobile";
import NameDialog from "@/components/logical-units/NameDialog";
import DocumentHeader from "@/components/logical-units/DocumentHeader";
import VideoPanel from "@/components/logical-units/VideoPanel";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ConnectionModal from "@/components/logical-units/ConnectionModal";
import CursorOverlay from "@/components/logical-units/CursorOverlay";
import type { ConnectionStatus, Collaborator } from "@/lib/document/types";
export type { ConnectionStatus, CursorPosition, Collaborator } from "@/lib/document/types";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const [userName, setUserName] = useState<string | null>(getStoredUserName());
  const [showNameDialog, setShowNameDialog] = useState(!getStoredUserName());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [showConnectingModal, setShowConnectingModal] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [videoPanelCollapsed, setVideoPanelCollapsed] = useState(false);
  const [signalConnected, setSignalConnected] = useState(false);
  const [mobileVideoOpen, setMobileVideoOpen] = useState(false);
  const [audioOutputId, setAudioOutputId] = useState(
    () => getStoredDevicePreferences().audioOutput || "",
  );

  // Shared refs passed into both hooks to avoid circular dependencies
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<Awaited<ReturnType<typeof WebViewer>> | null>(null);
  const providerRef = useRef<InstanceType<typeof YProvider> | null>(null);

  const { overlayRef, cursorCleanupRef, doUpdateCursorOverlay } = useCursorTracking(
    collaborators,
    viewerInstanceRef,
    viewerRef,
  );

  const { docName, isLoading } = useWebViewer({
    id: id!,
    isDark,
    viewerRef,
    viewerInstanceRef,
    providerRef,
    cursorCleanupRef,
    doUpdateCursorOverlay,
    setConnectionStatus,
    setCollaborators,
    navigate,
  });

  const { localStream, remoteStreams, startCamera, stopCamera, replaceLocalStream, localPeerId } =
    useWebRTC(id, signalConnected);

  // Sync peerId into Yjs awareness so other users can associate WebRTC peer with collaborator
  useEffect(() => {
    if (providerRef.current && localPeerId) {
      const user = providerRef.current.awareness.getLocalState()?.user as
        | Record<string, unknown>
        | undefined;
      if (user) {
        providerRef.current.awareness.setLocalStateField("user", { ...user, peerId: localPeerId });
      }
    }
  }, [localPeerId]);

  // Show "slow connection" modal only after a 4 s grace period so fast connects
  // never flash it. Disconnections are rendered immediately in JSX.
  useEffect(() => {
    if (isLoading || connectionStatus !== "connecting") {
      setShowConnectingModal(false);
      return;
    }
    const timer = setTimeout(() => setShowConnectingModal(true), 4000);
    return () => clearTimeout(timer);
  }, [isLoading, connectionStatus]);

  async function handleToggleCamera() {
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
  }

  async function handleReplaceStream(newStream: MediaStream, outputId: string) {
    setSignalConnected(true);
    await replaceLocalStream(newStream);
    setCameraOn(true);
    setAudioOutputId(outputId);
  }

  function updateAwareness(name: string) {
    if (providerRef.current) {
      const existing = providerRef.current.awareness.getLocalState()?.user as
        | Record<string, unknown>
        | undefined;
      providerRef.current.awareness.setLocalStateField("user", {
        ...existing,
        name,
        color: getUserColor(),
      });
    }
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.Core.annotationManager.setCurrentUser(name);
    }
  }

  function handleNameSave(name: string) {
    setUserName(name);
    setShowNameDialog(false);
    updateAwareness(name);
  }

  function handleUserNameChange(name: string) {
    setUserName(name);
    updateAwareness(name);
  }

  const videoPanelProps = {
    localStream,
    remoteStreams,
    cameraOn,
    onToggleCamera: handleToggleCamera,
    collaborators,
    localUser: { name: userName || "You", color: getUserColor() },
    onReplaceStream: handleReplaceStream,
    audioOutputId,
    connectionStatus,
  };

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
            {...videoPanelProps}
            collapsed={videoPanelCollapsed}
            onToggleCollapse={() => setVideoPanelCollapsed((v) => !v)}
          />
        )}

        <div className="flex-1 relative overflow-hidden">
          {isLoading && <LoadingSpinner message="Loading document..." />}
          {showConnectingModal && <ConnectionModal type="connecting" />}
          {!isLoading && connectionStatus === "disconnected" && (
            <ConnectionModal type="disconnected" />
          )}
          <div ref={viewerRef} className="w-full h-full" />
          <CursorOverlay overlayRef={overlayRef} />
        </div>
      </div>

      {isMobile && (
        <VideoPanel
          {...videoPanelProps}
          collapsed={false}
          onToggleCollapse={() => {}}
          isMobile
          mobileOpen={mobileVideoOpen}
          onMobileClose={() => setMobileVideoOpen(false)}
        />
      )}
    </div>
  );
}
