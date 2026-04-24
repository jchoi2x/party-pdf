import { useAuth0 } from '@auth0/auth0-react';
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { HttpClient } from '@/services/http.client';

type ApiAuthContextValue = {
  httpClient: HttpClient;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  getAccessToken: () => Promise<string | undefined>;
};

const ApiAuthContext = createContext<ApiAuthContextValue | null>(null);

export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const { getAccessTokenSilently } = useAuth0();
  const audience = import.meta.env.AUTH0_AUDIENCE?.trim() ?? '';

  const getAccessToken = useCallback(async () => {
    if (!audience) {
      return undefined;
    }
    try {
      return await getAccessTokenSilently({
        authorizationParams: {
          audience,
          scope: 'openid profile email',
        },
      });
    } catch {
      return undefined;
    }
  }, [audience, getAccessTokenSilently]);

  const httpClient = useMemo(
    () =>
      new HttpClient(`${window.location.origin}/api`, {
        getAccessToken,
      }),
    [getAccessToken],
  );

  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const token = await getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [getAccessToken],
  );

  const value = useMemo(
    () => ({
      httpClient,
      apiFetch,
      getAccessToken,
    }),
    [apiFetch, getAccessToken, httpClient],
  );

  return <ApiAuthContext.Provider value={value}>{children}</ApiAuthContext.Provider>;
}

export function useApiAuth(): ApiAuthContextValue {
  const ctx = useContext(ApiAuthContext);
  if (!ctx) {
    throw new Error('useApiAuth must be used within ApiAuthProvider');
  }
  return ctx;
}
