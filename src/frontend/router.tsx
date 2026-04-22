import { lazy } from 'react';
import { Route, Switch } from 'wouter';

const DocumentPage = lazy(() => import('@/pages/document'))
const Home = lazy(() => import('@/pages/home'))
const NotFound = lazy(() => import('@/pages/not-found'))

export default function Router() {
  return (
    <Switch>
      <Route path='/' component={Home} />
      <Route path='/document/:id' component={DocumentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
