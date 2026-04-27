import { OpenAPIHono } from '@hono/zod-openapi';

import { docsConfig } from './docs.config';
import { docsHandler } from './docs.handler';

export const docsRouter = new OpenAPIHono<{ Bindings: Env }>();

docsRouter.openapi(docsConfig, docsHandler);
