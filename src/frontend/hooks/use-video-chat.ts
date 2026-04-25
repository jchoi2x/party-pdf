import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type YProvider from 'y-partyserver/provider';
import { getStoredDevicePreferences } from '@/hooks/use-media-devices';
import { useWebRTC } from '@/hooks/use-webrtc';
import type { Collaborator } from '@/lib/document/types';
import { getUserColor } from '@/lib/username';

interface UseVideoChatOptions {
  id: string;
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>;
  collaborators: Collaborator[];
  userName: string | null;
}

export function useVideoChat({ id, providerRef, collaborators, userName }: UseVideoChatOptions) {
  const [cameraOn, setCameraOn] = useState(false);
  const [videoPanelCollapsed, setVideoPanelCollapsed] = useState(false);
  const [signalConnected, setSignalConnected] = useState(false);
  const [mobileVideoOpen, setMobileVideoOpen] = useState(false);
  const [audioOutputId, setAudioOutputId] = useState(() => getStoredDevicePreferences().audioOutput || '');

  const { localStream, remoteStreams, startCamera, stopCamera, replaceLocalStream, localPeerId } = useWebRTC(
    id,
    signalConnected,
  );

  // Propagate the WebRTC peer ID into Yjs awareness so collaborators can
  // associate video streams with the right user.
  useEffect(() => {
    if (!providerRef.current || !localPeerId) return;
    const user = providerRef.current.awareness.getLocalState()?.user as Record<string, unknown> | undefined;
    if (user) {
      providerRef.current.awareness.setLocalStateField('user', {
        ...user,
        peerId: localPeerId,
      });
    }
  }, [localPeerId, providerRef]);

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
        toast.error('Could not access camera. Check permissions and try again.');
      }
    }
  }, [cameraOn, startCamera, stopCamera]);

  const handleReplaceStream = useCallback(
    async (newStream: MediaStream, outputId: string) => {
      setSignalConnected(true);
      await replaceLocalStream(newStream);
      setCameraOn(true);
      setAudioOutputId(outputId);
    },
    [replaceLocalStream],
  );

  // Shared props for both desktop and mobile VideoPanel instances
  const videoPanelSharedProps = {
    localStream,
    remoteStreams,
    cameraOn,
    onToggleCamera: handleToggleCamera,
    collaborators,
    localUser: { name: userName || 'You', color: getUserColor() },
    onReplaceStream: handleReplaceStream,
    audioOutputId,
    providerRef,
  };

  return {
    videoPanelCollapsed,
    setVideoPanelCollapsed,
    mobileVideoOpen,
    setMobileVideoOpen,
    videoPanelSharedProps,
  };
}
