import type { Core } from '@pdftron/webviewer';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import YProvider from 'y-partyserver/provider';
import * as Y from 'yjs';
import type { Collaborator, ConnectionStatus, CursorPosition } from '@/lib/document/types';
import { getStoredUserName, getUserColor } from '@/lib/username';

const PARTY_HOST = `${window.location.host}/api`;
const XFDF_HEADER = '<?xml version="1.0" encoding="UTF-8" ?>';
const XFDF_OPEN = '<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">';
const XFDF_CLOSE = '</xfdf>';

export type PartyConnectionParams = Record<string, string>;

function wrapAnnotationNodeAsXfdf(annotationNodeXml: string): string {
  if (annotationNodeXml.trimStart().startsWith('<?xml')) {
    return annotationNodeXml;
  }
  return `${XFDF_HEADER}${XFDF_OPEN}<annots>${annotationNodeXml}</annots>${XFDF_CLOSE}`;
}

function splitXfdfIntoAnnotationEntries(xfdf: string): Array<{ id: string; xfdfNode: string }> {
  const parsed = new DOMParser().parseFromString(xfdf, 'text/xml');
  const annotsNode = parsed.querySelector('annots');
  if (!annotsNode) return [];

  const serializer = new XMLSerializer();
  return Array.from(annotsNode.children)
    .map((node) => {
      const id = node.getAttribute('name');
      if (!id) return null;
      return { id, xfdfNode: serializer.serializeToString(node) };
    })
    .filter((entry): entry is { id: string; xfdfNode: string } => Boolean(entry));
}

export function setupYjsCollaboration(
  annotationManager: Core.AnnotationManager,
  roomId: string,
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>,
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>,
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>,
  getPartyParams?: () => Promise<PartyConnectionParams>,
) {
  try {
    const ydoc = new Y.Doc();
    (window as any).ydoc = ydoc;

    const provider = new YProvider(PARTY_HOST, roomId, ydoc, {
      party: 'room',
      ...(getPartyParams ? { params: getPartyParams } : {}),
    });
    providerRef.current = provider;

    const annotationsMap = ydoc.getMap<string>('annotations');

    // isSyncing prevents the annotationChanged listener from re-broadcasting
    // changes that originated from a remote import.
    let isSyncing = false;

    // initialSyncComplete gates the observe callback so it doesn't process
    // changes (including spurious deletes from CRDT tombstones) that arrive
    // during the initial sync. handleSynced owns the initial load; after that
    // the observe handles real-time updates from other users.
    let initialSyncComplete = false;



    annotationsMap.observe(async (event) => {
      // Skip everything until the initial sync is done — handleSynced handles that
      if (!initialSyncComplete) return;
      if (isSyncing) return;
      if (event.transaction.origin === 'local') return;

      // Keep isSyncing true for the entire batch, not just per-iteration,
      // to close the race window between iterations.
      isSyncing = true;
      try {
        const deletes = [];
        for (const [key, change] of event.changes.keys) {
          if (change.action === 'delete') {
            const deleteXfdf = `<delete><id>${key}</id></delete>`;
            deletes.push(deleteXfdf);
          } else {
            const xfdf = annotationsMap.get(key);
            if (xfdf) {
              await annotationManager.importAnnotations(wrapAnnotationNodeAsXfdf(xfdf));
            }
          }
        }
        const del = `${XFDF_HEADER}${XFDF_OPEN}<fields />${deletes.join('')}${XFDF_CLOSE}`;
        await annotationManager.importAnnotationCommand(del);
      } catch (e) {
        console.error('Failed to apply remote annotation:', e);
      } finally {
        isSyncing = false;
      }
    });

    annotationManager.addEventListener(
      'annotationChanged',
      async (annotations: Core.Annotations.Annotation[], action: string, { imported }: { imported: boolean }) => {
        if (imported || isSyncing) return;
        try {
          if (action === 'delete') {
            ydoc.transact(() => {
              annotations.forEach((annot) => {
                if (annot.Id) annotationsMap.delete(annot.Id);
              });
            }, 'local');
          } else {
            const annots = annotations.filter((annot) => annot && !!annot.Id);
            if (annots.length === 0) return;
            const xfdf = await annotationManager.exportAnnotations({
              annotList: annots,
              widgets: false,
              links: false,
              fields: false,
              useDisplayAuthor: true,
            });
            const xfdfs = splitXfdfIntoAnnotationEntries(xfdf);

            ydoc.transact(() => {
              xfdfs.forEach(({ id, xfdfNode }) => annotationsMap.set(id, xfdfNode));
            }, 'local');

          }

        } catch (e) {
          console.error('Failed to sync annotation:', e);
        }
      },
    );



    const currentUser = getStoredUserName() || 'Guest'; 
    const currentColor = getUserColor();
    provider.awareness.setLocalStateField('user', {
      name: currentUser,
      color: currentColor,
    });

    function updateCollaborators() {
      const states = provider.awareness.getStates();
      const localClientId = provider.awareness.clientID;
      const others: Collaborator[] = [];
      states.forEach((state: Record<string, unknown>, clientId: number) => {
        if (clientId === localClientId) return;
        const user = state.user as Record<string, unknown> | undefined;
        if (!user) return;
        const name = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : null;
        const color = typeof user.color === 'string' && user.color ? user.color : '#90A4AE';
        const peerId = typeof user.peerId === 'string' ? user.peerId : undefined;
        const rawCursor = state.cursor as CursorPosition | null | undefined;
        const cursor =
          rawCursor &&
          typeof rawCursor.pageNumber === 'number' &&
          typeof rawCursor.x === 'number' &&
          typeof rawCursor.y === 'number'
            ? rawCursor
            : null;
        if (name) {
          others.push({ name, color, peerId, cursor });
        }
      });
      setCollaborators(others);
    }

    provider.awareness.on('change', updateCollaborators);

    const validStatuses = new Set<ConnectionStatus>(['connecting', 'connected', 'disconnected']);

    function handleStatus({ status }: { status: string }) {
      if (validStatuses.has(status as ConnectionStatus)) {
        setConnectionStatus(status as ConnectionStatus);
      } else {
        setConnectionStatus('disconnected');
      }
    }

    provider.on('status', handleStatus);

    async function handleSynced(synced: boolean) {
      if (!synced) return;
      isSyncing = true;
      try {
        const annotXfdfs = Object.values(annotationsMap.toJSON());
        if (annotXfdfs.length > 0) {
          annotationManager.importAnnotations(wrapAnnotationNodeAsXfdf(annotXfdfs.join('')));
        }
      } catch (e) {
        console.error('Failed to load initial annotations:', e);
      } finally {
        isSyncing = false;
        // Only open the observe callback for real-time updates after the
        // initial load is fully complete.
        initialSyncComplete = true;
      }
    }

    provider.on('synced', handleSynced);
  } catch (e) {
    console.warn('Real-time collaboration setup failed:', e);
    setConnectionStatus('disconnected');
  }
}
