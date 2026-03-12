import { useEffect, useRef, useState } from "react";
import { VideoCamera, VideoCameraSlash, CaretLeft, CaretRight, GearSix, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/username";
import type { Collaborator } from "@/pages/document";
import DeviceSettingsDialog from "./DeviceSettingsDialog";

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
    <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
        {label}
      </span>
    </div>
  );
}

function PlaceholderCard({ name, color }: { name: string; color: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-muted aspect-video flex flex-col items-center justify-center gap-1.5">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
        style={{ backgroundColor: color }}
      >
        {getInitials(name)}
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-[90%]">
        {name}
      </span>
    </div>
  );
}

function VideoPanelContent({
  localStream,
  remoteStreams,
  collaborators,
  localUser,
  audioOutputId,
}: Pick<VideoPanelProps, "localStream" | "remoteStreams" | "collaborators" | "localUser" | "audioOutputId">) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {localStream ? (
        <VideoTile stream={localStream} label="You" muted />
      ) : (
        <PlaceholderCard name={localUser.name} color={localUser.color} />
      )}

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
}: VideoPanelProps) {
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onMobileClose}
          />
        )}
        <div
          className={`fixed inset-x-0 bottom-0 z-50 bg-card border-t rounded-t-2xl shadow-lg transition-transform duration-300 ease-in-out ${
            mobileOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ maxHeight: "60vh" }}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Video</span>
            <div className="flex items-center gap-2">
              <Button
                variant={cameraOn ? "destructive" : "default"}
                size="sm"
                onClick={onToggleCamera}
                className="h-7 text-xs gap-1"
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
                className="h-7 w-7"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          <div style={{ maxHeight: "calc(60vh - 80px)", overflowY: "auto" }}>
            <VideoPanelContent
              localStream={localStream}
              remoteStreams={remoteStreams}
              collaborators={collaborators}
              localUser={localUser}
              audioOutputId={audioOutputId}
            />
          </div>
        </div>
      </>
    );
  }

  const hasStreams = localStream || remoteStreams.size > 0;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="relative flex-shrink-0 flex">
      <DeviceSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={onReplaceStream}
      />
      {!collapsed && (
        <div className="bg-card border-r flex flex-col w-64">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Video</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-7 w-7"
                title="Device settings"
              >
                <GearSix size={14} />
              </Button>
              <Button
                variant={cameraOn ? "destructive" : "default"}
                size="sm"
                onClick={onToggleCamera}
                className="h-7 text-xs gap-1"
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
          />
        </div>
      )}

      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center w-5 bg-card border-r hover:bg-muted transition-colors"
        title={collapsed ? "Expand video panel" : "Collapse video panel"}
      >
        {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
      </button>
    </div>
  );
}
