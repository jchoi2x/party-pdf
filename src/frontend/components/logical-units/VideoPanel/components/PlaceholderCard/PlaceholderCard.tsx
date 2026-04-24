import { getInitials } from '@/lib/username';

export function PlaceholderCard({ name, color }: { name: string; color: string }) {
  return (
    <div className='relative rounded-lg overflow-hidden bg-muted aspect-video flex flex-col items-center justify-center gap-1.5'>
      <div
        className='w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold'
        style={{ backgroundColor: color }}
      >
        {getInitials(name)}
      </div>
      <span className='text-xs text-muted-foreground truncate max-w-[90%]'>{name}</span>
    </div>
  );
}
