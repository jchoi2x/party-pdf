interface ConnectionModalProps {
  type: 'connecting' | 'disconnected';
}

const CONFIG = {
  connecting: {
    accent: 'blue',
    title: 'Connecting\u2026',
    message: 'This is taking longer than expected. Waiting for the collaboration server to respond.',
    iconPath: (
      <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' />
    ),
  },
  disconnected: {
    accent: 'yellow',
    title: 'Connection isn\u2019t stable',
    message: 'Lost connection to the collaboration server. Attempting to reconnect\u2026',
    iconPath: (
      <>
        <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
        <line x1='12' y1='9' x2='12' y2='13' />
        <line x1='12' y1='17' x2='12.01' y2='17' />
      </>
    ),
  },
} as const;

export default function ConnectionModal({ type }: ConnectionModalProps) {
  const { accent, title, message, iconPath } = CONFIG[type];
  const dotColor = accent === 'blue' ? 'bg-blue-500' : 'bg-yellow-500';
  const ringColor = accent === 'blue' ? 'bg-blue-500/15' : 'bg-yellow-500/15';
  const iconColor = accent === 'blue' ? 'text-blue-500' : 'text-yellow-500';

  return (
    <div className='absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
      <div className='bg-card border border-border rounded-xl shadow-xl px-8 py-7 flex flex-col items-center gap-3 max-w-sm mx-4 text-center'>
        <div className={`w-10 h-10 rounded-full ${ringColor} flex items-center justify-center`}>
          <svg
            aria-label={title}
            width='22'
            height='22'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className={iconColor}
          >
            {iconPath}
          </svg>
        </div>
        <p className='font-semibold text-foreground text-base'>{title}</p>
        <p className='text-sm text-muted-foreground leading-relaxed'>{message}</p>
        <div className='flex gap-1.5 mt-1'>
          <span className={`w-2 h-2 rounded-full ${dotColor} animate-bounce [animation-delay:-0.3s]`} />
          <span className={`w-2 h-2 rounded-full ${dotColor} animate-bounce [animation-delay:-0.15s]`} />
          <span className={`w-2 h-2 rounded-full ${dotColor} animate-bounce`} />
        </div>
      </div>
    </div>
  );
}
