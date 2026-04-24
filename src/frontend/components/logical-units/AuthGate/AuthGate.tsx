import { useAuth0 } from '@auth0/auth0-react';
import { type ReactNode, useEffect } from 'react';
import { ProfileCompletionGate } from '@/components/logical-units/ProfileCompletionGate';
import { Button } from '@/components/ui/button/button';
import { ApiAuthProvider } from '@/contexts/api-auth';

function FullPageMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-6'>
      <div className='max-w-md text-center space-y-2'>
        <h1 className='text-xl font-semibold text-foreground'>{title}</h1>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </div>
    </div>
  );
}

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated, isLoading, loginWithRedirect, error } = useAuth0();

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    void loginWithRedirect({
      appState: {
        returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      },
    });
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (error) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center p-6'>
        <div className='max-w-md text-center space-y-4'>
          <div className='space-y-2'>
            <h1 className='text-xl font-semibold text-foreground'>Authentication failed</h1>
            <p className='text-sm text-muted-foreground'>
              There was a problem logging you in with Auth0. Please verify your Auth0 application settings and try
              again.
            </p>
          </div>
          <Button onClick={() => void loginWithRedirect()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <FullPageMessage title='Checking session' description='Verifying your login status...' />;
  }

  if (!isAuthenticated) {
    return <FullPageMessage title='Redirecting to login' description='Taking you to Auth0 to continue...' />;
  }

  return (
    <ApiAuthProvider>
      <ProfileCompletionGate>{children}</ProfileCompletionGate>
    </ApiAuthProvider>
  );
}
