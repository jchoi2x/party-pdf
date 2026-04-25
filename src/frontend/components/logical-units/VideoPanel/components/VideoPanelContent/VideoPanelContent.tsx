import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useYjsAwarenessLive } from '@/hooks/use-yjs-awareness-live';
import { ConnectionDot } from '../ConnectionDot';
import { PlaceholderCard } from '../PlaceholderCard/PlaceholderCard';
import { VideoTile } from '../VideoTile';
import type { VideoPanelContentProps } from './VideoPanelContent.types';

function AwarenessStateTooltip({ state }: { state: Record<string, unknown> | null }) {
  if (!state) {
    return <p className='max-w-[min(90vw,20rem)]'>No Yjs awareness state yet.</p>;
  }
  return (
    <pre className='max-h-48 max-w-[min(90vw,20rem)] overflow-auto whitespace-pre-wrap text-left font-mono text-[10px] leading-relaxed'>
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}

export function VideoPanelContent({
  localStream,
  remoteStreams,
  collaborators,
  localUser,
  audioOutputId,
  connectionStatus,
  providerRef,
}: VideoPanelContentProps) {
  const { localAwareness, getAwarenessByPeerId } = useYjsAwarenessLive(providerRef);

  return (
    <TooltipProvider delayDuration={120}>
      <div className='flex-1 overflow-y-auto p-2 space-y-2'>
        <div className='relative'>
          <ConnectionDot connectionStatus={connectionStatus} />
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                {localStream ? (
                  <VideoTile stream={localStream} label='You' muted />
                ) : (
                  <PlaceholderCard name={localUser.name} color={localUser.color} />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side='right' className='max-w-none'>
              <AwarenessStateTooltip state={localAwareness} />
            </TooltipContent>
          </Tooltip>
        </div>

        {collaborators.map((collab) => {
          const stream = collab.peerId ? remoteStreams.get(collab.peerId) : undefined;
          return (
            <Tooltip key={collab.clientId}>
              <TooltipTrigger asChild>
                <div>
                  {stream ? (
                    <VideoTile stream={stream} label={collab.name} audioOutputId={audioOutputId} />
                  ) : (
                    <PlaceholderCard name={collab.name} color={collab.color} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side='right' className='max-w-none'>
                <AwarenessStateTooltip state={collab.awarenessState} />
              </TooltipContent>
            </Tooltip>
          );
        })}

        {remoteStreams.size > 0 &&
          (() => {
            const matchedPeerIds = new Set(collaborators.map((c) => c.peerId).filter(Boolean));
            const unmatchedEntries = Array.from(remoteStreams.entries()).filter(
              ([peerId]) => !matchedPeerIds.has(peerId),
            );
            return unmatchedEntries.map(([peerId, stream]) => {
              const awareness = getAwarenessByPeerId(peerId);
              return (
                <Tooltip key={peerId}>
                  <TooltipTrigger asChild>
                    <div>
                      <VideoTile
                        stream={stream}
                        label={peerId.split('-').slice(0, 2).join('-')}
                        audioOutputId={audioOutputId}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='right' className='max-w-none'>
                    <AwarenessStateTooltip
                      state={
                        awareness ?? {
                          note: 'Stream present but no matching awareness user.peerId',
                          peerId,
                        }
                      }
                    />
                  </TooltipContent>
                </Tooltip>
              );
            });
          })()}
      </div>
    </TooltipProvider>
  );
}
