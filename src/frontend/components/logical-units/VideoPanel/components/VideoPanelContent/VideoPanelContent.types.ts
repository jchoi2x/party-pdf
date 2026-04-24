import type { Collaborator, ConnectionStatus } from '@/pages/document';

export interface VideoPanelContentProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  collaborators: Collaborator[];
  localUser: { name: string; color: string };
  audioOutputId?: string;
  connectionStatus: ConnectionStatus;
}
