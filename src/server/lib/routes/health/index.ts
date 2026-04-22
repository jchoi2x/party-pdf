import { OpenAPIHono } from '@hono/zod-openapi';

import { pingRouter } from './ping/ping.route';

export const healthRouter = new OpenAPIHono<{ Bindings: Env }>();

healthRouter.route('', pingRouter);

export * from './ping';

