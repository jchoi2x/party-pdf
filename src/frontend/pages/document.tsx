import { useAuth0 } from '@auth0/auth0-react';
import type WebViewer from '@pdftron/webviewer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import type YProvider from 'y-partyserver/provider';
import DocumentHeader from '@/components/logical-units/DocumentHeader';
import DocumentPanel from '@/components/logical-units/DocumentPanel';
import VideoPanel from '@/components/logical-units/VideoPanel';
import { useCursorTracking } from '@/hooks/use-cursor-tracking';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVideoChat } from '@/hooks/use-video-chat';
import { useWebViewer } from '@/hooks/use-webviewer';
import type { Collaborator, ConnectionStatus } from '@/lib/document/types';
import { useTheme } from '@/lib/theme';
import { getUserColor } from '@/lib/username';

export type { Collaborator, ConnectionStatus, CursorPosition } from '@/lib/document/types';

export default function DocumentPage() {
  const { collabSessionId } = useParams<{ collabSessionId: string }>();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { user } = useAuth0();
  const isMobile = useIsMobile();

  const userName = useMemo(() => {
    const given = typeof user?.given_name === 'string' ? user.given_name.trim() : '';
    const family = typeof user?.family_name === 'string' ? user.family_name.trim() : '';
    const fullName = `${given} ${family}`.trim();
    if (fullName) return fullName;
    if (typeof user?.name === 'string' && user.name.trim()) return user.name.trim();
    if (typeof user?.nickname === 'string' && user.nickname.trim()) return user.nickname.trim();
    return 'Guest';
  }, [user]);
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

  const { docName, isLoading, isUnauthorized } = useWebViewer({
    collabSessionId: collabSessionId!,
    currentUserSub: typeof user?.sub === 'string' ? user.sub : null,
    currentUserEmail: typeof user?.email === 'string' ? user.email : null,
    isDark,
    viewerRef,
    viewerInstanceRef,
    providerRef,
    cursorCleanupRef,
    doUpdateCursorOverlay,
    setConnectionStatus,
    setCollaborators,
    navigate,
    userName,
  });

  const { videoPanelCollapsed, setVideoPanelCollapsed, mobileVideoOpen, setMobileVideoOpen, videoPanelSharedProps } =
    useVideoChat({
      collabSessionId: collabSessionId!,
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

  useEffect(() => {
    if (providerRef.current) {
      const existing = providerRef.current.awareness.getLocalState()?.user as Record<string, unknown> | undefined;
      providerRef.current.awareness.setLocalStateField('user', {
        ...existing,
        name: userName,
        color: getUserColor(),
      });
    }
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.Core.annotationManager.setCurrentUser(userName);
    }
  }, [userName]);

  if (isUnauthorized) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center'>
        <h1 className='text-2xl font-semibold text-foreground'>Session access denied</h1>
        <p className='max-w-md text-sm text-muted-foreground'>
          You are not listed as a participant for this collaboration session. Ask the owner to invite you and try again.
        </p>
        <button
          type='button'
          onClick={() => navigate('/')}
          className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground'
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className='flex flex-col flex-1 min-h-0 bg-background overflow-hidden'>
      <DocumentHeader
        documentName={docName || 'Loading...'}
        userName={userName}
        collaborators={collaborators}
        isMobile={isMobile}
        onMobileVideoToggle={() => setMobileVideoOpen(true)}
      />

      <div className='flex min-h-0 flex-1 overflow-hidden'>
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
