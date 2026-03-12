import { useEffect, useRef } from "react";
import { VideoCamera, VideoCameraSlash, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

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
}

function VideoTile({ stream, label, muted }: { stream: MediaStream; label: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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

function VideoPanelContent({
  localStream,
  remoteStreams,
  cameraOn,
  onToggleCamera,
}: Pick<VideoPanelProps, "localStream" | "remoteStreams" | "cameraOn" | "onToggleCamera">) {
  const hasStreams = localStream || remoteStreams.size > 0;

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {localStream && (
        <VideoTile stream={localStream} label="You" muted />
      )}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
        <VideoTile key={peerId} stream={stream} label={peerId.split("-").slice(0, 2).join("-")} />
      ))}
      {!hasStreams && (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-xs text-center px-4">
          Turn on your camera to start video sharing
        </div>
      )}
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
              cameraOn={cameraOn}
              onToggleCamera={onToggleCamera}
            />
          </div>
        </div>
      </>
    );
  }

  const hasStreams = localStream || remoteStreams.size > 0;

  return (
    <div className="relative flex-shrink-0 flex">
      {!collapsed && (
        <div className="bg-card border-r flex flex-col w-64">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Video</span>
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

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {localStream && (
              <VideoTile stream={localStream} label="You" muted />
            )}
            {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
              <VideoTile key={peerId} stream={stream} label={peerId.split("-").slice(0, 2).join("-")} />
            ))}
            {!hasStreams && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-xs text-center px-4">
                Turn on your camera to start video sharing
              </div>
            )}
          </div>
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
