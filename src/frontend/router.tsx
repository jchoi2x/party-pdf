import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import { AppShell } from '@/components/logical-units/AppShell';

const DashboardPage = lazy(() => import('@/pages/dashboard'));
const DocumentPage = lazy(() => import('@/pages/document'));
const Home = lazy(() => import('@/pages/home'));
const NotFound = lazy(() => import('@/pages/not-found'));
const ProfilePage = lazy(() => import('@/pages/profile'));

function RouteFallback() {
  return (
    <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground' aria-busy='true'>
      Loading…
    </div>
  );
}

export default function Router() {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path='/' component={Home} />
          <Route path='/profile' component={ProfilePage} />
          <Route path='/dashboard' component={DashboardPage} />
          <Route path='/document/:collabSessionId' component={DocumentPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppShell>
  );
}
