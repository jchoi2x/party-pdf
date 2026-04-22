import { useEffect, useRef, useState } from "react";
import { VideoCamera, VideoCameraSlash, CaretLeft, CaretRight, GearSix, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getInitials } from "@/lib/username";
import type { ConnectionStatus, Collaborator } from "@/pages/document";
import DeviceSettingsDialog from "./DeviceSettingsDialog";
import "./VideoPanel.styles.scss";

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
  connecting: { color: "video-panel__connection-dot--connecting", label: "Connecting...", pulse: true },
  connected: { color: "video-panel__connection-dot--connected", label: "Connected", pulse: false },
  disconnected: { color: "video-panel__connection-dot--disconnected", label: "Disconnected", pulse: false },
};

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  cameraOn: boolean;
  onToggleCamera: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collaborators: Collaborator[];
  localUser: { name: string; color: string };
  onReplaceStream: (stream: MediaStream, audioOutputId: string) => void;
  audioOutputId?: string;
  connectionStatus: ConnectionStatus;
}

function VideoTile({ stream, label, muted, audioOutputId }: { stream: MediaStream; label: string; muted?: boolean; audioOutputId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!videoRef.current || !audioOutputId || muted) return;
    const el = videoRef.current as any;
    if (typeof el.setSinkId === "function") {
      el.setSinkId(audioOutputId).catch(() => {});
    }
  }, [audioOutputId, muted]);

  return (
    <div className="video-panel__tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="video-panel__tile-video"
      />
      <span className="video-panel__tile-label">
        {label}
      </span>
    </div>
  );
}

function PlaceholderCard({ name, color }: { name: string; color: string }) {
  return (
    <div className="video-panel__placeholder">
      <div
        className="video-panel__placeholder-avatar"
        style={{ backgroundColor: color }}
      >
        {getInitials(name)}
      </div>
      <span className="video-panel__placeholder-name">
        {name}
      </span>
    </div>
  );
}

function ConnectionDot({ connectionStatus }: { connectionStatus: ConnectionStatus }) {
  const cfg = STATUS_CONFIG[connectionStatus];
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
            <span
              className={`video-panel__connection-dot ${cfg.color} ${cfg.pulse ? "video-panel__connection-dot--pulse" : ""}`}
              aria-label={cfg.label}
            />
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{cfg.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function VideoPanelContent({
  localStream,
  remoteStreams,
  collaborators,
  localUser,
  audioOutputId,
  connectionStatus,
}: Pick<VideoPanelProps, "localStream" | "remoteStreams" | "collaborators" | "localUser" | "audioOutputId" | "connectionStatus">) {
  return (
    <div className="video-panel__content">
      <div className="video-panel__tile-shell">
        <ConnectionDot connectionStatus={connectionStatus} />
        {localStream ? (
          <VideoTile stream={localStream} label="You" muted />
        ) : (
          <PlaceholderCard name={localUser.name} color={localUser.color} />
        )}
      </div>

      {collaborators.map((collab) => {
        const stream = collab.peerId ? remoteStreams.get(collab.peerId) : undefined;
        return stream ? (
          <VideoTile key={collab.peerId || collab.name} stream={stream} label={collab.name} audioOutputId={audioOutputId} />
        ) : (
          <PlaceholderCard key={collab.peerId || collab.name} name={collab.name} color={collab.color} />
        );
      })}

      {remoteStreams.size > 0 && (() => {
        const matchedPeerIds = new Set(
          collaborators.map((c) => c.peerId).filter(Boolean)
        );
        const unmatchedEntries = Array.from(remoteStreams.entries()).filter(
          ([peerId]) => !matchedPeerIds.has(peerId)
        );
        return unmatchedEntries.map(([peerId, stream]) => (
          <VideoTile key={peerId} stream={stream} label={peerId.split("-").slice(0, 2).join("-")} audioOutputId={audioOutputId} />
        ));
      })()}
    </div>
  );
}

export default function VideoPanel({
  localStream,
  remoteStreams,
  cameraOn,
  onToggleCamera,
  collapsed,
  onToggleCollapse,
  isMobile,
  mobileOpen,
  onMobileClose,
  collaborators,
  localUser,
  onReplaceStream,
  audioOutputId,
  connectionStatus,
}: VideoPanelProps) {
  if (isMobile) {
    return (
      <>
        <div
          className="video-panel__mobile-overlay"
          style={{
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
          }}
          onClick={onMobileClose}
        />
        <div
          className={`video-panel__mobile-sheet ${
            mobileOpen ? "video-panel__mobile-sheet--open" : "video-panel__mobile-sheet--closed"
          }`}
          style={{ maxHeight: "60vh" }}
        >
          <div className="video-panel__mobile-grabber-wrap">
            <div className="video-panel__mobile-grabber" />
          </div>

          <div className="video-panel__mobile-header">
            <span className="video-panel__title">Video</span>
            <div className="video-panel__mobile-actions">
              <Button
                variant={cameraOn ? "destructive" : "default"}
                size="sm"
                onClick={onToggleCamera}
                className="video-panel__camera-button"
              >
                {cameraOn ? (
                  <>
                    <VideoCameraSlash size={14} />
                    Off
                  </>
                ) : (
                  <>
                    <VideoCamera size={14} />
                    Camera
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMobileClose}
                className="video-panel__icon-button"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          <div className="video-panel__mobile-content">
            <VideoPanelContent
              localStream={localStream}
              remoteStreams={remoteStreams}
              collaborators={collaborators}
              localUser={localUser}
              audioOutputId={audioOutputId}
              connectionStatus={connectionStatus}
            />
          </div>
        </div>
      </>
    );
  }

  const hasStreams = localStream || remoteStreams.size > 0;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="video-panel">
      <DeviceSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={onReplaceStream}
      />
      <div
        className="video-panel__rail"
        style={{ width: collapsed ? 0 : 256 }}
      >
        <div className="video-panel__rail-inner">
          <div className="video-panel__rail-header">
            <span className="video-panel__title">Video</span>
            <div className="video-panel__rail-actions">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="video-panel__icon-button"
                title="Device settings"
              >
                <GearSix size={14} />
              </Button>
              <Button
                variant={cameraOn ? "destructive" : "default"}
                size="sm"
                onClick={onToggleCamera}
                className="video-panel__camera-button"
              >
                {cameraOn ? (
                  <>
                    <VideoCameraSlash size={14} />
                    Off
                  </>
                ) : (
                  <>
                    <VideoCamera size={14} />
                    Camera
                  </>
                )}
              </Button>
            </div>
          </div>

          <VideoPanelContent
            localStream={localStream}
            remoteStreams={remoteStreams}
            collaborators={collaborators}
            localUser={localUser}
            audioOutputId={audioOutputId}
            connectionStatus={connectionStatus}
          />
        </div>
      </div>

      <button
        onClick={onToggleCollapse}
        className="video-panel__collapse-button"
        title={collapsed ? "Expand video panel" : "Collapse video panel"}
      >
        {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
      </button>
    </div>
  );
}
