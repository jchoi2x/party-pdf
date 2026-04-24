import { OpenAPIHono } from '@hono/zod-openapi';

import { downloadUrlRouter } from './download-url/download-url.route';
import { uploadUrlRouter } from './upload-url/upload-url.route';

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

filesRouter.get('/docs/by-packet-id/:packet_id', (c) => {
  const jwtPayload = c.get('jwtPayload');
  const id = c.env.DOC.idFromName(jwtPayload.sub as string);
  const stub = c.env.DOC.get(id);
  return stub.fetch(c.req.raw);
});

filesRouter.get('/docs', (c) => {
  const jwtPayload = c.get('jwtPayload');
  const id = c.env.DOC.idFromName(jwtPayload.sub as string);
  const stub = c.env.DOC.get(id);
  return stub.fetch(c.req.raw);
});

filesRouter.route('', downloadUrlRouter).route('', uploadUrlRouter);

export * from './download-url';
export * from './upload-url';
