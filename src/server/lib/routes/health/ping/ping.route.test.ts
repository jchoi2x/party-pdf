import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { pingRouter } from './ping.route';

describe('pingRouter', () => {
  it('returns pong payload', async () => {
    const app = new Hono<{ Bindings: Env }>();
    app.route('', pingRouter);
    const res = await app.request('/ping');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'pong' });
  });
});
