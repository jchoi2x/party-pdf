import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { filesRouter } from './routes/files';

export class Document extends DurableObject {
  app = new Hono<{ Bindings: Env }>().basePath('/api');

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.app.route('', filesRouter);
  }

  async fetch(request: Request) {
    return this.app.fetch(request);
  }
}
