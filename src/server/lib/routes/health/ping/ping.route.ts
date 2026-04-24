import { OpenAPIHono } from '@hono/zod-openapi';

import { pingConfig } from './ping.config';
import { pingHandler } from './ping.handler';

export const pingRouter = new OpenAPIHono<{ Bindings: Env }>();

pingRouter.openapi(pingConfig, pingHandler);
