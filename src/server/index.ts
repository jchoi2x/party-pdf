import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { logger } from "hono/logger";
import { getServerByName } from "partyserver";

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.use(logger())

app.get("/ping", (c) => {
  return c.json({ message: "pong" })
});


app.get('/parties/parties/room/:id', async (c) => {
  const id = c.req.param('id');
  const server = await getServerByName(c.env.ROOM, id.toString());
  const response = await server.fetch(c.req.raw);
  return response;
});


showRoutes(app);

export default app;
export { Room } from './lib/durable'
