import { useAuth0 } from '@auth0/auth0-react';
import { FilePdf, Moon, Sun, UserCircle } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApiAuth } from '@/contexts/api-auth';
import { displayNameFromJwtClaims } from '@/lib/jwt-display-name';
import { UserService } from '@/services/user.service';

import type { AppNavbarProps } from './AppNavbar.types';

function primaryIdentityFromAuth0Profile(
  user: { given_name?: string; family_name?: string; name?: string; email?: string } | undefined,
): string | null {
  if (!user) {
    return null;
  }
  const given = user.given_name?.trim() ?? '';
  const family = user.family_name?.trim() ?? '';
  if (given.length > 0 && family.length > 0) {
    return `${given} ${family}`;
  }
  const name = user.name?.trim() ?? '';
  const email = user.email?.trim() ?? '';
  if (name.length > 0) {
    return name;
  }
  if (email.length > 0) {
    return email;
  }
  return null;
}

export function AppNavbar({ isDark, onToggleTheme }: AppNavbarProps) {
  const { isAuthenticated, logout, user } = useAuth0();
  const { httpClient } = useApiAuth();
  const userService = useMemo(() => new UserService(httpClient), [httpClient]);
  const [identityFromApi, setIdentityFromApi] = useState<string | null>(null);

  const profileLine = useMemo(() => {
    return primaryIdentityFromAuth0Profile(user) ?? identityFromApi ?? (isAuthenticated ? 'Signed in' : '');
  }, [user, identityFromApi, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIdentityFromApi(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await userService.getMe();
      if (cancelled || !res.ok || typeof res.data !== 'object' || res.data === null) {
        return;
      }
      setIdentityFromApi(displayNameFromJwtClaims(res.data as Record<string, unknown>));
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userService]);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='icon' className='h-9 w-9 shrink-0' title='Account menu'>
                <UserCircle size={22} weight='duotone' className='text-foreground' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-56' align='end' sideOffset={6}>
              <DropdownMenuLabel className='font-normal space-y-0.5'>
                <span className='truncate block text-sm font-medium text-foreground'>{profileLine}</span>
                <span className='truncate block text-xs text-muted-foreground'>Account</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href='/profile' className='cursor-pointer'>
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/dashboard' className='cursor-pointer'>
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='cursor-pointer text-destructive focus:text-destructive'
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
