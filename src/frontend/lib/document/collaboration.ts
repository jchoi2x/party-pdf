import type { Core } from '@pdftron/webviewer';
import _ from 'lodash';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import YProvider from 'y-partyserver/provider';
import * as Y from 'yjs';
import type { Collaborator, ConnectionStatus, CursorPosition } from '@/lib/document/types';
import { getStoredUserName, getUserColor } from '@/lib/username';
import { firstThen } from '../utils/first-then';

const PARTY_HOST = `${window.location.host}/api`;
const XFDF_HEADER = '<?xml version="1.0" encoding="UTF-8" ?>';
const XFDF_OPEN = '<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">';
const XFDF_CLOSE = '</xfdf>';
const XFDF_ANNOT_CMD_HEADER = `${XFDF_HEADER}${XFDF_OPEN}<fields />`;

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

function getWidgetIdFromXfdf(xfdf: string): string | null {
  const parsed = new DOMParser().parseFromString(xfdf, 'text/xml');
  const widgetNode = parsed.getElementsByTagNameNS('*', 'widget').item(0);
  return widgetNode?.getAttribute('name') ?? null;
}

type TSetupYjsCollaborationParams = {
  annotationManager: Core.AnnotationManager;
  documentViewer: Core.DocumentViewer;
  roomId: string;
  providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>;
  setCollaborators: Dispatch<SetStateAction<Collaborator[]>>;
  setConnectionStatus: Dispatch<SetStateAction<ConnectionStatus>>;
  getPartyParams?: () => Promise<PartyConnectionParams>;
  getDocumentId: () => string | undefined;
  Core: typeof Core;
};
const validStatuses = new Set<ConnectionStatus>(['connecting', 'connected', 'disconnected']);

function cloneAwarenessForUi(state: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  } catch {
    return { error: 'Awareness state is not JSON-serializable' };
  }
}

export function setupYjsCollaboration({
  annotationManager,
  roomId,
  providerRef,
  setCollaborators,
  setConnectionStatus,
  getPartyParams,
  getDocumentId,
  documentViewer,
  Core,
}: TSetupYjsCollaborationParams) {
  const ydoc = new Y.Doc();
  // biome-ignore lint/suspicious/noExplicitAny: for debugging
  (window as any).ydoc = ydoc;

  const provider = new YProvider(PARTY_HOST, roomId, ydoc, {
    party: 'room',
    connect: false,
    ...(getPartyParams ? { params: getPartyParams } : {}),
  });
  let isSyncing = false;

  // biome-ignore lint/suspicious/noExplicitAny: for debugging
  providerRef.current = (window as any).provider = provider;
  const documentsMap = ydoc.getMap<Y.Map<string>>('documents');
  const widgetDocumentsMap = ydoc.getMap<Y.Map<string>>('widget-documents');

  const setupCollaborators = () => {
    const currentUser = getStoredUserName() || 'Guest';
    const currentColor = getUserColor();
    provider.awareness.setLocalStateField('user', {
      name: currentUser,
      color: currentColor,
      annots: annotationManager.getAnnotationsList().length,
    });

    provider.awareness.on('change', function updateCollaborators() {
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
          others.push({
            name,
            color,
            peerId,
            cursor,
            clientId,
            awarenessState: cloneAwarenessForUi(state as Record<string, unknown>),
          });
        }
      });
      setCollaborators(others);
    });
  };

  const setupConnectionStatus = () => {
    provider.on('status', function handleStatus({ status }: { status: string }) {
      if (validStatuses.has(status as ConnectionStatus)) {
        setConnectionStatus(status as ConnectionStatus);
      } else {
        setConnectionStatus('disconnected');
      }
    });
  };

  const loadInitialAnnotations = async (annotationsMap: Y.Map<string>, widgetsMap: Y.Map<string>) => {
    try {
      const annotIds = Object.keys(annotationsMap.toJSON());
      const existingAnnotIds = annotationManager
        .getAnnotationsList()
        .map((annot) => annot.Id)
        .filter((id): id is string => Boolean(id));
      const missingAnnotIds = _.difference(annotIds, existingAnnotIds);
      const commonAnnotIds = _.intersection(annotIds, existingAnnotIds);
      const deleteAnnotIds = _.difference(existingAnnotIds, annotIds);

      const adds: string[] = [];
      missingAnnotIds.forEach((id) => {
        const xfdf = annotationsMap.get(id);
        if (xfdf) {
          adds.push(xfdf);
        }
      });

      const modifies: string[] = [];
      commonAnnotIds.forEach((id) => {
        const xfdf = annotationsMap.get(id);
        if (xfdf) {
          modifies.push(xfdf);
        }
      });

      const annotationOperations = [
        ...adds.map((xfdf) => ({ type: 'add' as const, value: xfdf })),
        ...modifies.map((xfdf) => ({ type: 'modify' as const, value: xfdf })),
        ...deleteAnnotIds.map((id) => ({ type: 'delete' as const, value: id })),
      ];
      if (annotationOperations.length > 0) {
        const annotationCommandChunks = _.chunk(annotationOperations, 20);
        await documentViewer.getAnnotationsLoadedPromise();

        for (const annotationCommandChunk of annotationCommandChunks) {
          const chunkAdds = annotationCommandChunk
            .filter((operation) => operation.type === 'add')
            .map((operation) => operation.value);
          const chunkModifies = annotationCommandChunk
            .filter((operation) => operation.type === 'modify')
            .map((operation) => operation.value);
          const chunkDeletes = annotationCommandChunk
            .filter((operation) => operation.type === 'delete')
            .map((operation) => `<id>${operation.value}</id>`);

          const annotationCommand = `${XFDF_ANNOT_CMD_HEADER}<add>${chunkAdds.join('')}</add><modify>${chunkModifies.join('')}</modify><delete>${chunkDeletes.join('')}</delete>${XFDF_CLOSE}`;
          console.log('importing annotation command chunk', {
            add: chunkAdds.length,
            modify: chunkModifies.length,
            delete: chunkDeletes.length,
          });
          await annotationManager.importAnnotationCommand(annotationCommand);
        }
      }

      const widgetIds = Object.keys(widgetsMap.toJSON());
      const existingWidgetIds = annotationManager
        .getAnnotationsList()
        .filter((annot) => annot instanceof Core.Annotations.WidgetAnnotation)
        .map((annot) => annot.Id)
        .filter((id): id is string => Boolean(id));
      const missingWidgetIds = _.difference(widgetIds, existingWidgetIds);
      const commonWidgetIds = _.intersection(widgetIds, existingWidgetIds);
      const deleteWidgetIds = _.difference(existingWidgetIds, widgetIds);

      const widgetImports = [...missingWidgetIds, ...commonWidgetIds]
        .map((id) => widgetsMap.get(id))
        .filter((xfdf): xfdf is string => Boolean(xfdf));

      const hasWorkToImport = annotationOperations.length > 0 || widgetImports.length > 0 || deleteWidgetIds.length > 0;

      if (hasWorkToImport) {
        await documentViewer.getAnnotationsLoadedPromise();
      }

      if (widgetImports.length > 0) {
        for (const widgetXfdf of widgetImports) {
          await annotationManager.importAnnotations(widgetXfdf);
        }
      }

      if (deleteWidgetIds.length > 0) {
        const widgetDeleteCommand = `${XFDF_ANNOT_CMD_HEADER}<add></add><modify></modify><delete>${deleteWidgetIds.map((id) => `<id>${id}</id>`).join('')}</delete>${XFDF_CLOSE}`;
        await annotationManager.importAnnotationCommand(widgetDeleteCommand);
      }
    } catch (e) {
      console.error('Failed to load initial annotations:', e);
    }
  };

  function getAnnotationsMap(docId: string) {
    if (!documentsMap.has(docId)) {
      const docMap = new Y.Map<string>();
      documentsMap.set(docId, docMap);
    }

    return documentsMap.get(docId)!;
  }

  function getWidgetAnnotationsMap(docId: string) {
    if (!widgetDocumentsMap.has(docId)) {
      const docMap = new Y.Map<string>();
      widgetDocumentsMap.set(docId, docMap);
    }

    return widgetDocumentsMap.get(docId)!;
  }
  const setupSynced = () => {
    provider.on('synced', async function handleSynced(synced: boolean) {
      if (!synced) {
        return;
      }
      isSyncing = true;
      const docId = getDocumentId();
      if (!docId) {
        return;
      }

      const annotationsMap = getAnnotationsMap(docId);
      const widgetAnnotationsMap = getWidgetAnnotationsMap(docId);

      try {
        const annotXfdfs = Object.values(annotationsMap.toJSON());
        const widgetXfdfs = Object.values(widgetAnnotationsMap.toJSON());

        if (annotXfdfs.length > 0 || widgetXfdfs.length > 0) {
          await documentViewer.getAnnotationsLoadedPromise();
        }

        if (annotXfdfs.length > 0) {
          await annotationManager.importAnnotations(wrapAnnotationNodeAsXfdf(annotXfdfs.join('')));
        }

        if (widgetXfdfs.length > 0) {
          for (const widgetXfdf of widgetXfdfs) {
            await annotationManager.importAnnotations(widgetXfdf);
          }
        }
      } catch (e) {
        console.error('Failed to load initial annotations:', e);
      } finally {
        isSyncing = false;
        // Only open the observe callback for real-time updates after the
        // initial load is fully complete.
        // initialSyncComplete = true;
      }
    });
  };

  // register one annotationChanged listener that will handle changes on all documents
  const setupAnnotationChanged = () => {
    // isSyncing prevents the annotationChanged listener from re-broadcasting
    // changes that originated from a remote import.

    async function annotationsChangedHandler(
      annotations: Core.Annotations.Annotation[],
      action: string,
      { imported }: { imported: boolean },
    ) {
      const docId = getDocumentId();
      if (!docId) {
        return;
      }
      const annotationsMap = getAnnotationsMap(docId);
      const widgetAnnotationsMap = getWidgetAnnotationsMap(docId);

      if (imported || isSyncing) return;

      try {
        if (action === 'delete') {
          ydoc.transact(() => {
            annotations.forEach((annot) => {
              if (!annot.Id) {
                return;
              }
              annotationsMap.delete(annot.Id);
              widgetAnnotationsMap.delete(annot.Id);
            });
          }, 'local');
        } else {
          const annots = annotations.filter((annot) => annot && !!annot.Id);
          if (annots.length === 0) return;
          const xfdf = await annotationManager.exportAnnotations({
            annotationList: annots.filter((annot) => !(annot instanceof Core.Annotations.WidgetAnnotation)),
            widgets: true,
            links: false,
            fields: true,
            useDisplayAuthor: true,
          });
          const xfdfs = splitXfdfIntoAnnotationEntries(xfdf);

          ydoc.transact(() => {
            xfdfs.forEach(({ id, xfdfNode }) => annotationsMap.set(id, xfdfNode));
          }, 'local');

          // widgets need to be exported separately because they have a <ffield /> element along with it
          const widgets = annots.filter((annot) => annot instanceof Core.Annotations.WidgetAnnotation);

          const widgetXfdfs = await Promise.all(
            widgets.map(async (widget) => {
              return annotationManager.exportAnnotations({
                annotationList: [widget],
                widgets: true,
                links: false,
                fields: true,
                useDisplayAuthor: true,
              });
            }),
          );
          ydoc.transact(() => {
            widgetXfdfs.forEach((widgetXfdf) => {
              const widgetId = getWidgetIdFromXfdf(widgetXfdf);
              if (!widgetId) {
                return;
              }
              widgetAnnotationsMap.set(widgetId, widgetXfdf);
            });
          }, 'local');
        }
      } catch (e) {
        console.error('Failed to sync annotation:', e);
      }
    }

    annotationManager.addEventListener('annotationChanged', annotationsChangedHandler);
  };

  const setupStatusMap = new Map<string, boolean>();

  const setupYjsCollab = () => {
    const docId = getDocumentId();
    if (!docId) {
      return;
    }

    const annotationsMap = getAnnotationsMap(docId);
    const widgetAnnotationsMap = getWidgetAnnotationsMap(docId);

    // if already setup for this docmentId then just load the initial annotations
    if (setupStatusMap.get(docId)) {
      console.log('setupYjsCollab already setup for docId', docId);
      return loadInitialAnnotations(annotationsMap, widgetAnnotationsMap);
    }

    // isSyncing prevents the annotationChanged listener from re-broadcasting
    // changes that originated from a remote import.
    let isSyncing = false;

    async function handleYjsAnnotationsChange(event: Y.YMapEvent<string>) {
      if (isSyncing || event.transaction.origin === 'local') {
        return;
      }

      // Keep isSyncing true for the entire batch, not just per-iteration,
      // to close the race window between iterations.
      isSyncing = true;
      try {
        const adds: string[] = [];
        const modifies: string[] = [];
        const deletes: string[] = [];
        for (const [key, change] of event.changes.keys) {
          if (change.action === 'delete') {
            deletes.push(`<id>${key}</id>`);
            continue;
          }

          const xfdf = annotationsMap.get(key);
          if (!xfdf) {
            continue;
          }

          const existingAnnot = annotationManager.getAnnotationById(key);
          if (existingAnnot) {
            modifies.push(xfdf);
          } else {
            adds.push(xfdf);
          }
        }
        if (adds.length === 0 && modifies.length === 0 && deletes.length === 0) {
          return;
        }

        const annotationCommand = `${XFDF_HEADER}${XFDF_OPEN}<fields /><add>${adds.join('')}</add><modify>${modifies.join('')}</modify><delete>${deletes.join('')}</delete>${XFDF_CLOSE}`;
        await annotationManager.importAnnotationCommand(annotationCommand);
      } catch (e) {
        console.error('Failed to apply remote annotation:', e);
      } finally {
        isSyncing = false;
      }
    }

    async function handleYjsWidgetAnnotationsChange(event: Y.YMapEvent<string>) {
      if (isSyncing || event.transaction.origin === 'local') {
        return;
      }

      isSyncing = true;
      try {
        const imports: string[] = [];
        const deletes: string[] = [];
        for (const [key, change] of event.changes.keys) {
          if (change.action === 'delete') {
            deletes.push(`<id>${key}</id>`);
            continue;
          }

          const xfdf = widgetAnnotationsMap.get(key);
          if (!xfdf) {
            continue;
          }
          imports.push(xfdf);
        }

        for (const widgetXfdf of imports) {
          await annotationManager.importAnnotations(widgetXfdf);
        }

        if (deletes.length > 0) {
          const deleteCommand = `${XFDF_ANNOT_CMD_HEADER}<add></add><modify></modify><delete>${deletes.join('')}</delete>${XFDF_CLOSE}`;
          await annotationManager.importAnnotationCommand(deleteCommand);
        }
      } catch (e) {
        console.error('Failed to apply remote widget annotation:', e);
      } finally {
        isSyncing = false;
      }
    }
    annotationsMap.observe(handleYjsAnnotationsChange);
    widgetAnnotationsMap.observe(handleYjsWidgetAnnotationsChange);
    setupStatusMap.set(docId, true);
    console.log('setupYjsCollab setup complete for docId', docId);
    return loadInitialAnnotations(annotationsMap, widgetAnnotationsMap);
  };

  const initialize = () => {
    setupCollaborators();
    setupConnectionStatus();
    setupSynced();
    setupYjsCollab();
    setupAnnotationChanged();
    if (!provider.wsconnected) {
      provider.connect();
    }
  };

  return {
    onDocumentLoaded: firstThen(initialize, setupYjsCollab),
    setupCollab: setupAnnotationChanged,
  };
}
