import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { logger } from 'hono/logger';
import { getServerByName } from 'partyserver';
import { requireAuth0Jwt } from './lib/auth/require-auth0-jwt';
import { apiApp } from './lib/routes';
import { withSentry } from './lib/sentry';

const partiesApp = new Hono<{ Bindings: Env }>();
partiesApp.use('*', requireAuth0Jwt);
partiesApp.get('/room/:id', async (c) => {
  const id = c.req.param('id');
  const server = await getServerByName(c.env.ROOM, id.toString());
  const response = await server.fetch(c.req.raw);
  return response;
});

const app = new Hono<{ Bindings: Env }>();

app.use(logger());

app.route('', apiApp);
app.route('/api/parties', partiesApp);

app.get('/api/ping', (c) => {
  return c.json({ message: 'pong' });
});

showRoutes(app);

export default withSentry(app);
export { Room } from './lib/durable';
export { Document } from './lib/durable/document/document.do';
