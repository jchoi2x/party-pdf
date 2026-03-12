import { useEffect, useRef, useState, useCallback } from "react";

interface PeerConnection {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
}

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

const PARTY_HOST = "oblockparty.xvzf.workers.dev";

export function useWebRTC(roomId: string | undefined, enabled: boolean) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localPeerId, setLocalPeerId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const myPeerIdRef = useRef<string | null>(null);

  const updateRemoteStreams = useCallback(() => {
    const map = new Map<string, MediaStream>();
    for (const [id, peer] of peersRef.current) {
      if (peer.stream && peer.stream.getTracks().length > 0) {
        map.set(id, peer.stream);
      }
    }
    setRemoteStreams(new Map(map));
  }, []);

  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.pc.close();
      peersRef.current.delete(peerId);
      updateRemoteStreams();
    }
  }, [updateRemoteStreams]);

  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!.pc;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peerData: PeerConnection = { pc, stream: null };
    peersRef.current.set(peerId, peerData);

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          target: peerId,
          candidate: e.candidate,
        }));
      }
    };

    pc.ontrack = (e) => {
      peerData.stream = e.streams[0] || new MediaStream([e.track]);
      updateRemoteStreams();
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        removePeer(peerId);
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN && pc.localDescription) {
            wsRef.current.send(JSON.stringify({
              type: "offer",
              target: peerId,
              sdp: pc.localDescription,
            }));
          }
        })
        .catch((err) => console.error("[webrtc] Failed to create offer:", err));
    }

    return pc;
  }, [updateRemoteStreams, removePeer]);

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      setLocalStream(stream);

      for (const [, peer] of peersRef.current) {
        const senders = peer.pc.getSenders();
        for (const track of stream.getTracks()) {
          const existing = senders.find((s) => s.track?.kind === track.kind);
          if (existing) {
            existing.replaceTrack(track);
          } else {
            peer.pc.addTrack(track, stream);
          }
        }
      }
      return true;
    } catch (err) {
      console.warn("[webrtc] Failed to get camera:", err);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  useEffect(() => {
    if (!roomId || !enabled) return;

    const wsUrl = `wss://${PARTY_HOST}/signal?room=${encodeURIComponent(roomId)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "peer-id":
            myPeerIdRef.current = msg.peerId;
            setLocalPeerId(msg.peerId);
            break;

          case "peer-list":
            for (const peerId of msg.peers) {
              if (localStreamRef.current) {
                createPeerConnection(peerId, true);
              }
            }
            break;

          case "peer-joined":
            break;

          case "peer-left":
            removePeer(msg.peerId);
            break;

          case "offer": {
            const pc = createPeerConnection(msg.from, false);
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "answer",
                target: msg.from,
                sdp: pc.localDescription,
              }));
            }
            break;
          }

          case "answer": {
            const peer = peersRef.current.get(msg.from);
            if (peer) {
              await peer.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
            break;
          }

          case "ice-candidate": {
            const peer = peersRef.current.get(msg.from);
            if (peer) {
              await peer.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
            break;
          }
        }
      } catch (err) {
        console.error("[webrtc] Message handling error:", err);
      }
    };

    ws.onclose = () => {
      console.log("[webrtc] Signal connection closed");
    };

    ws.onerror = (err) => {
      console.warn("[webrtc] Signal connection error:", err);
    };

    return () => {
      for (const [, peer] of peersRef.current) {
        peer.pc.close();
      }
      peersRef.current.clear();
      setRemoteStreams(new Map());

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          track.stop();
        }
        localStreamRef.current = null;
        setLocalStream(null);
      }

      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [roomId, enabled, createPeerConnection, removePeer]);

  return { localStream, remoteStreams, startCamera, stopCamera, localPeerId };
}
