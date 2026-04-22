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
}
