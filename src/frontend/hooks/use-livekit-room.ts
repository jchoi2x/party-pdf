import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, type LocalParticipant, type RemoteParticipant } from 'livekit-client';
import { useApiAuth } from '@/contexts/api-auth';

interface StartCameraOptions {
  videoDeviceId?: string;
  audioDeviceId?: string;
}

interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  url: string;
}

interface UseLiveKitRoomOptions {
  roomName: string;
  participantName: string;
}

function getParticipantStream(participant: LocalParticipant | RemoteParticipant) {
  const stream = new MediaStream();
  for (const publication of participant.trackPublications.values()) {
    const mediaTrack = publication.track?.mediaStreamTrack;
    if (mediaTrack) {
      stream.addTrack(mediaTrack);
    }
  }
  return stream.getTracks().length > 0 ? stream : null;
}

export function useLiveKitRoom({ roomName, participantName }: UseLiveKitRoomOptions) {
  const { apiFetch } = useApiAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const roomRef = useRef<Room | null>(null);

  const updateLocalStream = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setLocalStream(null);
      return;
    }
    setLocalStream(getParticipantStream(room.localParticipant));
  }, []);

  const updateRemoteStreams = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setRemoteStreams(new Map());
      return;
    }

    const nextStreams = new Map<string, MediaStream>();
    for (const participant of room.remoteParticipants.values()) {
      const stream = getParticipantStream(participant);
      if (stream) {
        nextStreams.set(participant.identity, stream);
      }
    }
    setRemoteStreams(nextStreams);
  }, []);

  const bindRoomEvents = useCallback(
    (room: Room) => {
      room.on(RoomEvent.ParticipantConnected, updateRemoteStreams);
      room.on(RoomEvent.ParticipantDisconnected, updateRemoteStreams);
      room.on(RoomEvent.TrackSubscribed, updateRemoteStreams);
      room.on(RoomEvent.TrackUnsubscribed, updateRemoteStreams);
      room.on(RoomEvent.LocalTrackPublished, updateLocalStream);
      room.on(RoomEvent.LocalTrackUnpublished, updateLocalStream);
      room.on(RoomEvent.Disconnected, () => {
        setLocalStream(null);
        setRemoteStreams(new Map());
        roomRef.current = null;
      });
    },
    [updateLocalStream, updateRemoteStreams],
  );

  const ensureConnected = useCallback(async () => {
    const existing = roomRef.current;
    if (existing && existing.state !== 'disconnected') {
      return existing;
    }

    const res = await apiFetch('/api/videos/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch LiveKit token (${res.status})`);
    }

    const payload = (await res.json()) as LiveKitTokenResponse;
    const room = new Room();
    bindRoomEvents(room);

    await room.connect(payload.url, payload.token);
    roomRef.current = room;
    updateLocalStream();
    updateRemoteStreams();
    return room;
  }, [apiFetch, bindRoomEvents, participantName, roomName, updateLocalStream, updateRemoteStreams]);

  const startCamera = useCallback(
    async (deviceIds?: StartCameraOptions): Promise<boolean> => {
      try {
        const room = await ensureConnected();

        if (deviceIds?.audioDeviceId) {
          await room.switchActiveDevice('audioinput', deviceIds.audioDeviceId);
        }
        if (deviceIds?.videoDeviceId) {
          await room.switchActiveDevice('videoinput', deviceIds.videoDeviceId);
        }

        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
        updateLocalStream();
        return true;
      } catch (err) {
        console.warn('[livekit] Failed to start camera:', err);
        return false;
      }
    },
    [ensureConnected, updateLocalStream],
  );

  const stopCamera = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    void room.localParticipant.setCameraEnabled(false);
    void room.localParticipant.setMicrophoneEnabled(false);
    setLocalStream(null);
  }, []);

  const replaceLocalStream = useCallback(
    async (newStream: MediaStream) => {
      const room = await ensureConnected();
      for (const publication of room.localParticipant.trackPublications.values()) {
        const track = publication.track;
        if (track) {
          room.localParticipant.unpublishTrack(track, true);
        }
      }

      for (const track of newStream.getTracks()) {
        await room.localParticipant.publishTrack(track);
      }

      setLocalStream(newStream);
    },
    [ensureConnected],
  );

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    room.disconnect(true);
    roomRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
  }, []);

  useEffect(() => disconnect, [disconnect]);

  return {
    localStream,
    remoteStreams,
    localPeerId: participantName,
    startCamera,
    stopCamera,
    replaceLocalStream,
    disconnect,
  };
}
