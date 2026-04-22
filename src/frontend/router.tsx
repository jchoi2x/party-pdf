import { Route, Switch } from 'wouter';
import DocumentPage from '@/pages/document';
import Home from '@/pages/home';
import NotFound from '@/pages/not-found';

export default function Router() {
  return (
    <Switch>
      <Route path='/' component={Home} />
      <Route path='/document/:id' component={DocumentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
