import { useEffect, useRef } from "react";
import { VideoCamera, VideoCameraSlash, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  cameraOn: boolean;
  onToggleCamera: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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

export default function VideoPanel({
  localStream,
  remoteStreams,
  cameraOn,
  onToggleCamera,
  collapsed,
  onToggleCollapse,
}: VideoPanelProps) {
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
