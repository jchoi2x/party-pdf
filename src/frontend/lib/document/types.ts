export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface CursorPosition {
  pageNumber: number;
  x: number;
  y: number;
}

export interface Collaborator {
  name: string;
  color: string;
  peerId?: string;
  cursor?: CursorPosition | null;
  /** Yjs / y-protocols awareness client id for this remote peer. */
  clientId: number;
  /** Full awareness state for this client (JSON-serializable snapshot). */
  awarenessState: Record<string, unknown>;
}
