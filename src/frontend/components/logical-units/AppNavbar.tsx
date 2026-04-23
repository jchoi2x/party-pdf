import { FilePdf, Moon, Sun } from '@phosphor-icons/react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';

interface AppNavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function AppNavbar({ isDark, onToggleTheme }: AppNavbarProps) {
  const { isAuthenticated, logout } = useAuth0();

  return (
    <header className='flex items-center justify-between px-4 sm:px-6 py-2 border-b bg-card shadow-sm'>
      <div className='flex items-center gap-3'>
        <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-primary'>
          <FilePdf size={18} weight='fill' className='text-primary-foreground' />
        </div>
        <span
          className='text-base sm:text-lg font-semibold text-foreground'
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Party-PDF
        </span>
      </div>
      <div className='flex items-center gap-2'>
        {isAuthenticated ? (
          <Button
            variant='outline'
            size='sm'
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          >
            Logout
          </Button>
        ) : null}
        <Button
          variant='ghost'
          size='icon'
          onClick={onToggleTheme}
          className='h-9 w-9'
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} weight='bold' /> : <Moon size={18} weight='bold' />}
        </Button>
      </div>
    </header>
  );
}
