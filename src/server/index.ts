import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { logger } from 'hono/logger';
import { getServerByName } from 'partyserver';
import { requireAuth0Jwt } from './lib/middleware/auth';
import { apiApp } from './lib/routes';
import { withSentry } from './lib/sentry';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.use(logger());

app.route('', apiApp);
app.get('/parties/room/:id', requireAuth0Jwt, async (c) => {
  const id = c.req.param('id');
  const server = await getServerByName(c.env.ROOM, id.toString());
  const response = await server.fetch(c.req.raw);
  return response;
});

showRoutes(app);

export default withSentry(app);
export { Document, Room } from './lib/durable';
