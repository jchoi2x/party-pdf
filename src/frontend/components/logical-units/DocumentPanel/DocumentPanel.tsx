import type { RefObject } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { ConnectionStatus } from '@/lib/document/types';
import ConnectionModal from './components/ConnectionModal';
import CursorOverlay from './components/CursorOverlay';

interface DocumentPanelProps {
  isLoading: boolean;
  showConnectingModal: boolean;
  connectionStatus: ConnectionStatus;
  viewerRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
}

export default function DocumentPanel({
  isLoading,
  showConnectingModal,
  connectionStatus,
  viewerRef,
  overlayRef,
}: DocumentPanelProps) {
  return (
    <div className='relative flex min-h-0 flex-1 overflow-hidden'>
      {isLoading && <LoadingSpinner message='Loading document...' />}
      {showConnectingModal && <ConnectionModal type='connecting' />}
      {!isLoading && connectionStatus === 'disconnected' && <ConnectionModal type='disconnected' />}
      <div ref={viewerRef} className='absolute inset-0 z-0 overflow-hidden' />
      <CursorOverlay overlayRef={overlayRef} />
    </div>
  );
}
