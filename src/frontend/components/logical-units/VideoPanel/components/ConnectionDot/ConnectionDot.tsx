import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ConnectionStatus } from '@/pages/document';

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
  connecting: { color: 'bg-yellow-400', label: 'Connecting...', pulse: true },
  connected: { color: 'bg-green-500', label: 'Connected', pulse: false },
  disconnected: { color: 'bg-red-500', label: 'Disconnected', pulse: false },
};

export function ConnectionDot({ connectionStatus }: { connectionStatus: ConnectionStatus }) {
  const cfg = STATUS_CONFIG[connectionStatus];
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`absolute top-2 left-2 z-10 h-2.5 w-2.5 rounded-full ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''} ring-1 ring-black/20`}
          />
        </TooltipTrigger>
        <TooltipContent side='right'>
          <p>{cfg.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
