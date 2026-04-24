import type WebViewer from '@pdftron/webviewer';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import type YProvider from 'y-partyserver/provider';
import DocumentHeader from '@/components/logical-units/DocumentHeader';
import DocumentPanel from '@/components/logical-units/DocumentPanel';
import NameDialog from '@/components/logical-units/NameDialog';
import VideoPanel from '@/components/logical-units/VideoPanel';
import { useCursorTracking } from '@/hooks/use-cursor-tracking';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVideoChat } from '@/hooks/use-video-chat';
import { useWebViewer } from '@/hooks/use-webviewer';
import type { Collaborator, ConnectionStatus } from '@/lib/document/types';
import { useTheme } from '@/lib/theme';
import { getStoredUserName, getUserColor } from '@/lib/username';

export type { Collaborator, ConnectionStatus, CursorPosition } from '@/lib/document/types';

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isMobile = useIsMobile();

  const [userName, setUserName] = useState<string | null>(getStoredUserName());
  const [showNameDialog, setShowNameDialog] = useState(!getStoredUserName());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [showConnectingModal, setShowConnectingModal] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Shared refs threaded through multiple hooks
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<Awaited<ReturnType<typeof WebViewer>> | null>(null);
  const providerRef = useRef<InstanceType<typeof YProvider> | null>(null);

  const { overlayRef, cursorCleanupRef, doUpdateCursorOverlay } = useCursorTracking(
    collaborators,
    viewerInstanceRef,
    viewerRef,
  );

  const { docName, isLoading } = useWebViewer({
    id: id!,
    isDark,
    viewerRef,
    viewerInstanceRef,
    providerRef,
    cursorCleanupRef,
    doUpdateCursorOverlay,
    setConnectionStatus,
    setCollaborators,
    navigate,
  });

  const { videoPanelCollapsed, setVideoPanelCollapsed, mobileVideoOpen, setMobileVideoOpen, videoPanelSharedProps } =
    useVideoChat({
      id: id!,
      providerRef,
      collaborators,
      userName,
    });

  // Show "slow connection" modal only after a 4 s grace period so fast
  // connects never flash it. Disconnections are rendered immediately.
  useEffect(() => {
    if (isLoading || connectionStatus !== 'connecting') {
      setShowConnectingModal(false);
      return;
    }
    const timer = setTimeout(() => setShowConnectingModal(true), 4000);
    return () => clearTimeout(timer);
  }, [isLoading, connectionStatus]);

  function updateAwareness(name: string) {
    if (providerRef.current) {
      const existing = providerRef.current.awareness.getLocalState()?.user as Record<string, unknown> | undefined;
      providerRef.current.awareness.setLocalStateField('user', {
        ...existing,
        name,
        color: getUserColor(),
      });
    }
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.Core.annotationManager.setCurrentUser(name);
    }
  }

  function handleNameSave(name: string) {
    setUserName(name);
    setShowNameDialog(false);
    updateAwareness(name);
  }

  function handleUserNameChange(name: string) {
    setUserName(name);
    updateAwareness(name);
  }

  return (
    <div className='flex flex-col flex-1 min-h-0 bg-background overflow-hidden'>
      <NameDialog open={showNameDialog} onSave={handleNameSave} />

      {!showNameDialog && (
        <DocumentHeader
          documentName={docName || 'Loading...'}
          userName={userName || ''}
          onUserNameChange={handleUserNameChange}
          collaborators={collaborators}
          isMobile={isMobile}
          onMobileVideoToggle={() => setMobileVideoOpen(true)}
        />
      )}

      <div className='flex-1 flex overflow-hidden'>
        {!isMobile && (
          <VideoPanel
            {...videoPanelSharedProps}
            connectionStatus={connectionStatus}
            collapsed={videoPanelCollapsed}
            onToggleCollapse={() => setVideoPanelCollapsed((v) => !v)}
          />
        )}

        <DocumentPanel
          isLoading={isLoading}
          showConnectingModal={showConnectingModal}
          connectionStatus={connectionStatus}
          viewerRef={viewerRef}
          overlayRef={overlayRef}
        />
      </div>

      {isMobile && (
        <VideoPanel
          {...videoPanelSharedProps}
          connectionStatus={connectionStatus}
          collapsed={false}
          onToggleCollapse={() => {}}
          isMobile
          mobileOpen={mobileVideoOpen}
          onMobileClose={() => setMobileVideoOpen(false)}
        />
      )}
    </div>
  );
}
