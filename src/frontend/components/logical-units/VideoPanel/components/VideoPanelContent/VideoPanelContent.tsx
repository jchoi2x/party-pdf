import { ConnectionDot } from '../ConnectionDot';
import { PlaceholderCard } from '../PlaceholderCard/PlaceholderCard';
import { VideoTile } from '../VideoTile';
import type { VideoPanelContentProps } from './VideoPanelContent.types';

export function VideoPanelContent({
  localStream,
  remoteStreams,
  collaborators,
  localUser,
  audioOutputId,
  connectionStatus,
}: VideoPanelContentProps) {
  return (
    <div className='flex-1 overflow-y-auto p-2 space-y-2'>
      <div className='relative'>
        <ConnectionDot connectionStatus={connectionStatus} />
        {localStream ? (
          <VideoTile stream={localStream} label='You' muted />
        ) : (
          <PlaceholderCard name={localUser.name} color={localUser.color} />
        )}
      </div>

      {collaborators.map((collab) => {
        const stream = collab.peerId ? remoteStreams.get(collab.peerId) : undefined;
        return stream ? (
          <VideoTile
            key={collab.peerId || collab.name}
            stream={stream}
            label={collab.name}
            audioOutputId={audioOutputId}
          />
        ) : (
          <PlaceholderCard key={collab.peerId || collab.name} name={collab.name} color={collab.color} />
        );
      })}

      {remoteStreams.size > 0 &&
        (() => {
          const matchedPeerIds = new Set(collaborators.map((c) => c.peerId).filter(Boolean));
          const unmatchedEntries = Array.from(remoteStreams.entries()).filter(
            ([peerId]) => !matchedPeerIds.has(peerId),
          );
          return unmatchedEntries.map(([peerId, stream]) => (
            <VideoTile
              key={peerId}
              stream={stream}
              label={peerId.split('-').slice(0, 2).join('-')}
              audioOutputId={audioOutputId}
            />
          ));
        })()}
    </div>
  );
}
