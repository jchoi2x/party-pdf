interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className='absolute inset-0 flex items-center justify-center bg-background z-10'>
      <div className='flex flex-col items-center gap-3'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary' />
        <p className='text-sm text-muted-foreground'>{message}</p>
      </div>
    </div>
  );
}
