import type { MutableRefObject } from 'react';
import { useEffect, useState } from 'react';
import type YProvider from 'y-partyserver/provider';

function cloneAwarenessJson(state: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  } catch {
    return { error: 'Awareness state is not JSON-serializable' };
  }
}

/**
 * Subscribes to Yjs awareness updates and exposes the local state plus lookup by WebRTC peer id.
 * Waits until `providerRef.current` is set (e.g. after the document loads).
 */
export function useYjsAwarenessLive(providerRef: MutableRefObject<InstanceType<typeof YProvider> | null>) {
  const [, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let detach: (() => void) | undefined;

    const attach = () => {
      if (cancelled) return;
      const provider = providerRef.current;
      if (!provider) {
        raf = requestAnimationFrame(attach);
        return;
      }
      const onChange = () => bump((n) => n + 1);
      provider.awareness.on('change', onChange);
      onChange();
      detach = () => {
        provider.awareness.off('change', onChange);
      };
    };

    attach();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      detach?.();
    };
  }, [providerRef]);

  const provider = providerRef.current;
  if (!provider) {
    return {
      localAwareness: null as Record<string, unknown> | null,
      getAwarenessByPeerId: (_peerId: string) => null as Record<string, unknown> | null,
    };
  }

  const rawLocal = provider.awareness.getLocalState();
  const localAwareness = rawLocal ? cloneAwarenessJson(rawLocal as Record<string, unknown>) : null;

  const getAwarenessByPeerId = (peerId: string): Record<string, unknown> | null => {
    const states = provider.awareness.getStates();
    for (const state of states.values()) {
      const rec = state as Record<string, unknown>;
      const user = rec.user as Record<string, unknown> | undefined;
      if (user && user.peerId === peerId) {
        return cloneAwarenessJson(rec);
      }
    }
    return null;
  };

  return { localAwareness, getAwarenessByPeerId };
}
