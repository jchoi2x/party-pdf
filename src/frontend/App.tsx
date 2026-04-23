import { Auth0Provider } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Router as WouterRouter } from 'wouter';
import AuthGate from '@/components/logical-units/AuthGate';
import { getAuth0Config, isAuth0Configured } from '@/lib/auth0';
import Router from '@/router';

const queryClient = new QueryClient();
const auth0Config = isAuth0Configured ? getAuth0Config() : null;

function App() {
  if (!auth0Config) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center p-6'>
        <div className='max-w-md text-center space-y-2'>
          <h1 className='text-xl font-semibold text-foreground'>Auth0 is not configured</h1>
          <p className='text-sm text-muted-foreground'>
            Set `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` in your local environment, then restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
      onRedirectCallback={(appState) => {
        const returnTo = (appState as { returnTo?: string } | undefined)?.returnTo ?? '/';
        window.history.replaceState({}, document.title, returnTo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthGate>
            <Router />
          </AuthGate>
        </WouterRouter>
        <Toaster richColors position='top-right' />
      </QueryClientProvider>
    </Auth0Provider>
  );
}

export default App;
