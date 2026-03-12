import { createServer } from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "@y/websocket-server/utils";

const PORT = process.env.PARTY_PORT || 1999;

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Y.js collaboration server is running");
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const docName = url.searchParams.get("room") || url.pathname.split("/").pop() || "default";
  console.log(`[y-server] Client connected, room: ${docName}`);
  setupWSConnection(ws, req, { docName });
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[y-server] Y.js WebSocket server listening on port ${PORT}`);
});
