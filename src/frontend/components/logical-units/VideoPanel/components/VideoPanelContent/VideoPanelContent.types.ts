import type { MutableRefObject } from 'react';
import type YProvider from 'y-partyserver/provider';
import type { Collaborator, ConnectionStatus } from '@/pages/document';

export interface VideoPanelContentProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  collaborators: Collaborator[];
  localUser: { name: string; color: string };
  audioOutputId?: string;
  connectionStatus: ConnectionStatus;
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>;
}
