import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "@y/websocket-server/utils";

const PORT = process.env.PARTY_PORT || 1999;

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Y.js collaboration server is running");
});

const wss = new WebSocketServer({ noServer: true });
const signalWss = new WebSocketServer({ noServer: true });

const signalRooms = new Map();

function getRoom(roomId) {
  if (!signalRooms.has(roomId)) {
    signalRooms.set(roomId, new Map());
  }
  return signalRooms.get(roomId);
}

let peerIdCounter = 0;

signalWss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const roomId = url.searchParams.get("room") || "default";
  const peerId = `peer-${++peerIdCounter}-${Date.now()}`;
  const room = getRoom(roomId);

  room.set(peerId, ws);
  console.log(`[signal] Peer ${peerId} joined room ${roomId} (${room.size} peers)`);

  ws.send(JSON.stringify({ type: "peer-id", peerId }));

  const existingPeers = [];
  for (const [id] of room) {
    if (id !== peerId) existingPeers.push(id);
  }
  ws.send(JSON.stringify({ type: "peer-list", peers: existingPeers }));

  for (const [id, peer] of room) {
    if (id !== peerId && peer.readyState === 1) {
      peer.send(JSON.stringify({ type: "peer-joined", peerId }));
    }
  }

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (["offer", "answer", "ice-candidate"].includes(msg.type) && msg.target) {
        const target = room.get(msg.target);
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({ ...msg, from: peerId }));
        }
      }
    } catch (e) {
      console.error("[signal] Invalid message:", e);
    }
  });

  ws.on("close", () => {
    room.delete(peerId);
    console.log(`[signal] Peer ${peerId} left room ${roomId} (${room.size} peers)`);
    for (const [, peer] of room) {
      if (peer.readyState === 1) {
        peer.send(JSON.stringify({ type: "peer-left", peerId }));
      }
    }
    if (room.size === 0) {
      signalRooms.delete(roomId);
    }
  });
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const docName = url.searchParams.get("room") || url.pathname.split("/").pop() || "default";
  console.log(`[y-server] Client connected, room: ${docName}`);
  setupWSConnection(ws, req, { docName });
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/signal") {
    signalWss.handleUpgrade(req, socket, head, (ws) => {
      signalWss.emit("connection", ws, req);
    });
  } else {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[y-server] Y.js WebSocket server listening on port ${PORT}`);
});
