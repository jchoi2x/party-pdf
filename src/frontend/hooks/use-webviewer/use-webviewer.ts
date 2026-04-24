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
import { getDocument } from '@/lib/indexeddb';
import { getStoredUserName } from '@/lib/username';
import { configureWebViewerInstance, getWebViewerConstructorOptions } from './lib/configuration';

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
        let docUrl: string | null = null;
        let localBlob: Blob | null = null;
        let name = '';

        const cached = sessionStorage.getItem(id);
        if (cached) {
          const parsed = JSON.parse(cached);
          docUrl = parsed.downloadUrl;
          name = parsed.name;
          console.debug('Cached document found:', docUrl, name);
        } else {
          try {
            const res = await apiFetch(`${variables.apiBase}/download-url/${id}`);
            if (!res.ok) throw new Error('Failed to fetch download URL');
            const data = await res.json();
            docUrl = data.url;
            name = 'Shared Document';
            console.debug('Cloud document fetched:', docUrl, name);
          } catch (cloudErr) {
            console.warn('Cloud download failed, trying local fallback:', cloudErr);
            const localDoc = await getDocument(id);
            if (!localDoc) {
              toast.error('Document not found. Please upload the PDF again.');
              navigate('/');
              return;
            }
            localBlob = localDoc.blob;
            name = localDoc.name;
          }
        }

        setDocName(name);

        if (!viewerRef.current || viewerInitialized.current) return;
        viewerInitialized.current = true;

        const instance = await WebViewer(getWebViewerConstructorOptions(docUrl), viewerRef.current);

        viewerInstanceRef.current = instance;
        // biome-ignore lint/suspicious/noExplicitAny: this is for debugging purposes
        (window as any).instance = instance;

        try {
          const english = translateEn;
          const flattenedEnglish = flatten(english) as {
            [key: string]: string;
          };
          instance.UI.setTranslations('en', flattenedEnglish);
        } catch (i18nErr) {
          console.warn('Failed to load i18n translations:', i18nErr);
        }

        configureWebViewerInstance(instance, isDark);

        const { documentViewer, annotationManager } = instance.Core;
        annotationManager.setCurrentUser(getStoredUserName() || 'Guest');

        documentViewer.addEventListener('documentLoaded', () => {
          setIsLoading(false);
          setupYjsCollaboration(
            annotationManager,
            id,
            providerRef,
            setCollaborators,
            setConnectionStatus,
            getPartyParams,
          );
          setupCursorTracking(instance, providerRef, cursorCleanupRef, doUpdateCursorOverlay);
        });

        if (localBlob) {
          instance.UI.loadDocument(localBlob, { filename: name });
        }
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
