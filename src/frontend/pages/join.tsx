import { useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';

/**
 * Landing path for invitation emails. After Auth0 login/sign-up, sends the user to the document session.
 */
export default function JoinSessionPage() {
  const search = useSearch();
  const [, navigate] = useLocation();

  useEffect(() => {
    const sessionId = new URLSearchParams(search).get('session')?.trim();
    if (sessionId) {
      navigate(`/document/${sessionId}`, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  }, [search, navigate]);

  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <p className='text-sm text-muted-foreground' aria-busy='true'>
        Opening your session…
      </p>
    </div>
  );
}
