import WebViewer from '@pdftron/webviewer';
import { flatten } from 'flat';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type YProvider from 'y-partyserver/provider';
import { variables } from '@/constants/vars';
import translateEn from '@/constants/webviewer/translate-en.json';
import { useApiAuth } from '@/contexts/api-auth';
import { type PartyConnectionParams, setupYjsCollaboration } from '@/lib/document/collaboration';
import { setupCursorTracking } from '@/lib/document/cursor-tracking';
import { applyWebViewerTheme } from '@/lib/document/theme';
import type { Collaborator, ConnectionStatus } from '@/lib/document/types';
import { configureWebViewerInstance, getWebViewerConstructorOptions } from './lib/configuration';

type CollabSessionResponse = {
  data: {
    participants: Array<{
      id: string;
      email: string;
      user_sub: string | null;
    }>;
    documents: Array<{
      id: string;
      collab_session_id: string;
      filename: string;
      download_url: string;
    }>;
  };
};

interface UseWebViewerOptions {
  collabSessionId: string;
  currentUserSub: string | null;
  currentUserEmail: string | null;
  isDark: boolean;
  viewerRef: RefObject<HTMLDivElement | null>;
  viewerInstanceRef: MutableRefObject<Awaited<ReturnType<typeof WebViewer>> | null>;
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>;
  cursorCleanupRef: MutableRefObject<(() => void) | null>;
  doUpdateCursorOverlay: () => void;
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>;
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>;
  navigate: (path: string) => void;
  userName: string;
}

export function useWebViewer({
  collabSessionId,
  currentUserSub,
  currentUserEmail,
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
}: UseWebViewerOptions) {
  const { apiFetch, getAccessToken } = useApiAuth();
  const viewerInitialized = useRef(false);
  const initialUserName = useRef(userName);
  const [docName, setDocName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const getPartyParams = useCallback(async (): Promise<PartyConnectionParams> => {
    const token = await getAccessToken();
    if (token) {
      return { access_token: token };
    }
    return {};
  }, [getAccessToken]);

  useEffect(() => {
    if (!collabSessionId) {
      navigate('/');
      return;
    }

    async function init() {
      try {
        let name = '';
        let sessionDocs: CollabSessionResponse['data']['documents'] = [];

        const sessionRes = await apiFetch(`${variables.apiBase}/collab-sessions/${collabSessionId}`);
        if (sessionRes.status === 403) {
          setIsUnauthorized(true);
          setConnectionStatus('disconnected');
          setIsLoading(false);
          return;
        }
        if (!sessionRes.ok) {
          throw new Error(`Failed to fetch collab session (${sessionRes.status})`);
        }
        const sessionData = (await sessionRes.json()) as CollabSessionResponse;
        const participants = sessionData.data?.participants ?? [];
        sessionDocs = sessionData.data?.documents ?? [];
        if (sessionDocs.length > 0) {
          name = sessionDocs[0]?.filename ?? 'Shared Documents';
        }

        const normalizedCurrentEmail = currentUserEmail?.trim().toLowerCase() ?? null;
        const preloadedCollaborators: Collaborator[] = participants
          .filter((participant) => {
            const sameBySub = currentUserSub && participant.user_sub ? participant.user_sub === currentUserSub : false;
            const sameByEmail =
              normalizedCurrentEmail && participant.email
                ? participant.email.trim().toLowerCase() === normalizedCurrentEmail
                : false;
            return !sameBySub && !sameByEmail;
          })
          .map((participant, index) => {
            const nameFromEmail = participant.email.split('@')[0];
            return {
              name: nameFromEmail || 'Participant',
              color: ['#7C4DFF', '#0EA5E9', '#10B981', '#F97316', '#EC4899'][index % 5],
              clientId: -(index + 1),
              awarenessState: {
                source: 'preloaded_session_participants',
                email: participant.email,
                user_sub: participant.user_sub,
              },
            };
          });
        setCollaborators(preloadedCollaborators);
        setIsUnauthorized(false);

        setDocName(name);

        if (!viewerRef.current || viewerInitialized.current) return;
        viewerInitialized.current = true;

        const instance = await WebViewer(getWebViewerConstructorOptions(), viewerRef.current);

        viewerInstanceRef.current = instance;
        // biome-ignore lint/suspicious/noExplicitAny: this is for debugging purposes
        (window as any).instance = instance;
        (window as any).dv = instance.Core.documentViewer;
        (window as any).am = instance.Core.annotationManager;

        try {
          const english = translateEn;
          const flattenedEnglish = flatten(english) as {
            [key: string]: string;
          };
          instance.UI.setTranslations('en', flattenedEnglish);
        } catch (i18nErr) {
          console.warn('Failed to load i18n translations:', i18nErr);
        }

        const { documentViewer, annotationManager } = instance.Core;
        annotationManager.setCurrentUser(initialUserName.current);

        const getDocumentId = () => {
          const doc = documentViewer.getDocument();
          const documentId = doc ? doc.getDocumentId() : undefined;
          if (documentId && !Number.isNaN(parseInt(documentId, 10))) {
            const filename = doc.getFilename();
            const docId = sessionDocs.find((sessionDoc) => sessionDoc.filename === filename)?.id;
            return docId!;
          }
          return documentId;
        };

        const { onDocumentLoaded } = setupYjsCollaboration({
          annotationManager,
          documentViewer,
          roomId: collabSessionId,
          providerRef,
          setCollaborators,
          setConnectionStatus,
          getPartyParams,
          getDocumentId,
          Core: instance.Core,
          userName: initialUserName.current,
        });

        documentViewer.addEventListener(
          'documentLoaded',
          () => {
            console.debug('Document Loaded [once]');
            setIsLoading(false);
            onDocumentLoaded();
            setupCursorTracking(instance, providerRef, cursorCleanupRef, doUpdateCursorOverlay);
          },
          { once: false },
        );

        documentViewer.addEventListener(instance.Core.DocumentViewer.Events.DOCUMENT_UNLOADED, () => {
          console.debug('Document Unloaded');
        });

        configureWebViewerInstance(instance, isDark);

        Array.from(sessionDocs)
          .reverse()
          .forEach(({ download_url, filename, id }, index) => {
            console.log('adding tab', { download_url, filename, documentId: id, index });
            instance.UI.TabManager.addTab(download_url, {
              filename,
              documentId: id,
              setActive: index === sessionDocs.length - 1,
            });
          });
      } catch (err) {
        console.error('WebViewer initialization failed:', err);
        toast.error('Failed to load document. Please try again.');
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (cursorCleanupRef.current) {
        cursorCleanupRef.current();
        cursorCleanupRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [apiFetch, collabSessionId, currentUserEmail, currentUserSub, getPartyParams, navigate, setCollaborators, setConnectionStatus]);

  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (instance) {
      instance.UI.setTheme(isDark ? instance.UI.Theme.DARK : instance.UI.Theme.LIGHT);
      applyWebViewerTheme(instance, isDark);
    }
  }, [isDark]);

  return { docName, isLoading, isUnauthorized };
}
