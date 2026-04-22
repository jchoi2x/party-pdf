import type { Core } from '@pdftron/webviewer';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import YProvider from 'y-partyserver/provider';
import * as Y from 'yjs';
import type { Collaborator, ConnectionStatus, CursorPosition } from '@/lib/document/types';
import { getStoredUserName, getUserColor } from '@/lib/username';

const PARTY_HOST = 'oblockparty.xvzf.workers.dev';

export function setupYjsCollaboration(
  annotationManager: Core.AnnotationManager,
  roomId: string,
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>,
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>,
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>,
) {
  try {
    const ydoc = new Y.Doc();

    const provider = new YProvider(PARTY_HOST, roomId, ydoc, {
      party: 'room',
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
        for (const [key, change] of event.changes.keys) {
          if (change.action === 'delete') {
            const deleteXfdf = `<?xml version="1.0" encoding="UTF-8" ?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><fields /><delete><id>${key}</id></delete></xfdf>`;
            await annotationManager.importAnnotationCommand(deleteXfdf);
          } else {
            const xfdf = annotationsMap.get(key);
            if (xfdf) {
              await annotationManager.importAnnotations(xfdf);
            }
          }
        }
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
          for (const annotation of annotations) {
            const annotId = annotation.Id;
            if (!annotId) continue;

            if (action === 'delete') {
              ydoc.transact(() => {
                annotationsMap.delete(annotId);
              }, 'local');
            } else {
              const xfdf = await annotationManager.exportAnnotations({
                annotList: [annotation],
                useDisplayAuthor: true,
              });
              ydoc.transact(() => {
                annotationsMap.set(annotId, xfdf);
              }, 'local');
            }
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
        for (const [, xfdf] of annotationsMap) {
          await annotationManager.importAnnotations(xfdf);
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
