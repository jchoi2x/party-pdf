import { useEffect, useRef } from 'react';

interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  audioOutputId?: string;
}

export function VideoTile({ stream, label, muted, audioOutputId }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!videoRef.current || !audioOutputId || muted) return;
    const el = videoRef.current as HTMLVideoElement;
    if (typeof el.setSinkId === 'function') {
      el.setSinkId(audioOutputId).catch(() => {});
    }
  }, [audioOutputId, muted]);

  return (
    <div className='relative rounded-lg overflow-hidden bg-muted aspect-video'>
      <video ref={videoRef} autoPlay playsInline muted={muted} className='w-full h-full object-cover' />
      <span className='absolute bottom-1 left-1 text-2xs bg-black/60 text-white px-1.5 py-0.5 rounded'>{label}</span>
    </div>
  );
}
