import { CaretLeft, CaretRight, GearSix, VideoCamera, VideoCameraSlash, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Collaborator, ConnectionStatus } from '@/pages/document';
import DeviceSettingsDialog from '../DeviceSettingsDialog';
import { VideoPanelContent } from './components/VideoPanelContent';

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  cameraOn: boolean;
  onToggleCamera: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collaborators: Collaborator[];
  localUser: { name: string; color: string };
  onReplaceStream: (stream: MediaStream, audioOutputId: string) => void;
  audioOutputId?: string;
  connectionStatus: ConnectionStatus;
}

export default function VideoPanel({
  localStream,
  remoteStreams,
  cameraOn,
  onToggleCamera,
  collapsed,
  onToggleCollapse,
  isMobile,
  mobileOpen,
  onMobileClose,
  collaborators,
  localUser,
  onReplaceStream,
  audioOutputId,
  connectionStatus,
}: VideoPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  // const hasStreams = localStream || remoteStreams.size > 0;

  if (isMobile) {
    return (
      <>
        <div
          className='fixed inset-0 bg-black/40 z-40 transition-opacity duration-300'
          style={{
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
          }}
          onClick={onMobileClose}
        />
        <div
          className={`fixed inset-x-0 bottom-0 z-50 bg-card border-t rounded-t-2xl shadow-lg transition-transform duration-300 ease-in-out ${
            mobileOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '60vh' }}
        >
          <div className='flex justify-center pt-2 pb-1'>
            <div className='w-10 h-1 rounded-full bg-muted-foreground/30' />
          </div>

          <div className='px-3 pb-2 flex items-center justify-between'>
            <span className='text-sm font-medium text-foreground'>Video</span>
            <div className='flex items-center gap-2'>
              <Button
                variant={cameraOn ? 'destructive' : 'default'}
                size='sm'
                onClick={onToggleCamera}
                className='h-7 text-xs gap-1'
              >
                {cameraOn ? (
                  <>
                    <VideoCameraSlash size={14} />
                    Off
                  </>
                ) : (
                  <>
                    <VideoCamera size={14} />
                    Camera
                  </>
                )}
              </Button>
              <Button variant='ghost' size='icon' onClick={onMobileClose} className='h-7 w-7'>
                <X size={16} />
              </Button>
            </div>
          </div>

          <div style={{ maxHeight: 'calc(60vh - 80px)', overflowY: 'auto' }}>
            <VideoPanelContent
              localStream={localStream}
              remoteStreams={remoteStreams}
              collaborators={collaborators}
              localUser={localUser}
              audioOutputId={audioOutputId}
              connectionStatus={connectionStatus}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className='relative flex-shrink-0 flex'>
      <DeviceSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onSave={onReplaceStream} />
      <div
        className='bg-card border-r flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out'
        style={{ width: collapsed ? 0 : 256 }}
      >
        <div className='w-64 flex flex-col flex-1 min-h-0'>
          <div className='p-3 border-b flex items-center justify-between'>
            <span className='text-sm font-medium text-foreground'>Video</span>
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setSettingsOpen(true)}
                className='h-7 w-7'
                title='Device settings'
              >
                <GearSix size={14} />
              </Button>
              <Button
                variant={cameraOn ? 'destructive' : 'default'}
                size='sm'
                onClick={onToggleCamera}
                className='h-7 text-xs gap-1'
              >
                {cameraOn ? (
                  <>
                    <VideoCameraSlash size={14} />
                    Off
                  </>
                ) : (
                  <>
                    <VideoCamera size={14} />
                    Camera
                  </>
                )}
              </Button>
            </div>
          </div>

          <VideoPanelContent
            localStream={localStream}
            remoteStreams={remoteStreams}
            collaborators={collaborators}
            localUser={localUser}
            audioOutputId={audioOutputId}
            connectionStatus={connectionStatus}
          />
        </div>
      </div>

      <button
        type='button'
        onClick={onToggleCollapse}
        className='flex items-center justify-center w-5 bg-card border-r hover:bg-muted transition-colors'
        title={collapsed ? 'Expand video panel' : 'Collapse video panel'}
      >
        {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
      </button>
    </div>
  );
}
