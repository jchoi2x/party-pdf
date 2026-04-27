import { OpenAPIHono } from '@hono/zod-openapi';

import { getSessionsConfig } from './get-sessions.config';
import { getSessionsHandler } from './get-sessions.handler';

export const getSessionsRouter = new OpenAPIHono<{ Bindings: Env }>();

getSessionsRouter.openapi(getSessionsConfig, getSessionsHandler);
