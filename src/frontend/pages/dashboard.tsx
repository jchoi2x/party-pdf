import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <div className='flex-1 bg-background p-8'>
      <h1 className='text-xl font-semibold text-foreground'>Dashboard</h1>
      <p className='mt-2 text-sm text-muted-foreground'>This page is a placeholder.</p>
      <Button asChild className='mt-6' variant='outline'>
        <Link href='/'>Back home</Link>
      </Button>
    </div>
  );
}
