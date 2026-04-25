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
import { getStoredUserName } from '@/lib/username';
import { configureWebViewerInstance, getWebViewerConstructorOptions } from './lib/configuration';

type PacketDocumentsResponse = {
  data: Array<{
    id: string;
    packet_id: string;
    filename: string;
    download_url: string;
  }>;
};

interface UseWebViewerOptions {
  id: string;
  isDark: boolean;
  viewerRef: RefObject<HTMLDivElement | null>;
  viewerInstanceRef: MutableRefObject<Awaited<ReturnType<typeof WebViewer>> | null>;
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>;
  cursorCleanupRef: MutableRefObject<(() => void) | null>;
  doUpdateCursorOverlay: () => void;
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>;
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>;
  navigate: (path: string) => void;
}

export function useWebViewer({
  id,
  isDark,
  viewerRef,
  viewerInstanceRef,
  providerRef,
  cursorCleanupRef,
  doUpdateCursorOverlay,
  setConnectionStatus,
  setCollaborators,
  navigate,
}: UseWebViewerOptions) {
  const { apiFetch, getAccessToken } = useApiAuth();
  const viewerInitialized = useRef(false);
  const [docName, setDocName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const getPartyParams = useCallback(async (): Promise<PartyConnectionParams> => {
    const token = await getAccessToken();
    if (token) {
      return { access_token: token };
    }
    return {};
  }, [getAccessToken]);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    async function init() {
      try {
        let name = '';
        let packetDocs: PacketDocumentsResponse['data'] = [];

        try {
          const res = await apiFetch(`${variables.apiBase}/docs/by-packet-id/${id}`);
          if (!res.ok) throw new Error('Failed to fetch packet documents');
          const data = (await res.json()) as PacketDocumentsResponse;
          packetDocs = data.data ?? [];
          if (packetDocs.length > 0) {
            name = packetDocs[0]?.filename ?? 'Shared Documents';
          }
        } catch (cloudErr) {
          console.warn('Cloud packet fetch failed, trying local fallback:', cloudErr);
        }


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
        annotationManager.setCurrentUser(getStoredUserName() || 'Guest');


        const getDocumentId = () => {
          const doc = documentViewer.getDocument();
          const documentId = doc ? doc.getDocumentId() : undefined;
          if (documentId && !Number.isNaN(parseInt(documentId, 10))) {
            const filename = doc.getFilename();
            const docId = packetDocs.find((doc) => doc.filename === filename)?.id;
            return docId!;
          }
          return documentId;
        };

        const { onDocumentLoaded } = setupYjsCollaboration({
          annotationManager,
          documentViewer,
          roomId: id,
          providerRef,
          setCollaborators,
          setConnectionStatus,
          getPartyParams,
          getDocumentId,
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



        Array.from(packetDocs)
          .reverse()
          .forEach(({ download_url, filename, id }, index) => {
            console.log('adding tab', { download_url, filename, documentId: id, index });
            instance.UI.TabManager.addTab(download_url, {
              filename,
              documentId: id,
              setActive: index === packetDocs.length - 1,
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
  }, [apiFetch, getPartyParams, id]);

  useEffect(() => {
    const instance = viewerInstanceRef.current;
    if (instance) {
      instance.UI.setTheme(isDark ? instance.UI.Theme.DARK : instance.UI.Theme.LIGHT);
      applyWebViewerTheme(instance, isDark);
    }
  }, [isDark]);

  return { docName, isLoading };
}
