import { OpenAPIHono } from '@hono/zod-openapi';

import { docsBySessionIdConfig } from './docs-by-session-id.config';
import { docsBySessionIdHandler } from './docs-by-session-id.handler';

export const docsBySessionIdRouter = new OpenAPIHono<{ Bindings: Env }>();

docsBySessionIdRouter.openapi(docsBySessionIdConfig, docsBySessionIdHandler);
