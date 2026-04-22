import { Hono } from 'hono';

const app = new Hono().basePath('/api');

app.get('/ping', (c) => c.json({ message: 'pong' }));

export default app;
