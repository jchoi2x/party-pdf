import { OpenAPIHono } from '@hono/zod-openapi';

import { createSessionConfig } from './create-session.config';
import { createSessionHandler } from './create-session.handler';

export const createSessionRouter = new OpenAPIHono<{ Bindings: Env }>();

createSessionRouter.openapi(createSessionConfig, createSessionHandler);
