import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { logger } from 'hono/logger';
import { getServerByName } from 'partyserver';
import { apiApp } from './lib/routes';
import { withSentry } from './lib/sentry';

const app = new Hono<{ Bindings: Env }>();

app.use(logger());

app.route('', apiApp);

app.get('/api/ping', (c) => {
  return c.json({ message: 'pong' });
});

app.get('/api/parties/parties/room/:id', async (c) => {
  const id = c.req.param('id');
  const server = await getServerByName(c.env.ROOM, id.toString());
  const response = await server.fetch(c.req.raw);
  return response;
});

showRoutes(app);

export default withSentry(app);
export { Room } from './lib/durable';
