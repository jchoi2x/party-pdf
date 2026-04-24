import { AppNavbar } from '@/components/logical-units/AppNavbar';
import { useTheme } from '@/lib/theme';

import type { AppShellProps } from './AppShell.types';

export function AppShell({ children }: AppShellProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className='min-h-screen flex flex-col bg-background'>
      <AppNavbar isDark={isDark} onToggleTheme={toggleTheme} />
      <main className='flex-1 flex flex-col min-h-0'>{children}</main>
    </div>
  );
}
