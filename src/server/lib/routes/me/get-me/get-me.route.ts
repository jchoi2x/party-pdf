import { OpenAPIHono } from '@hono/zod-openapi';

import { getMeConfig } from './get-me.config';
import { getMeHandler } from './get-me.handler';

export const getMeRouter = new OpenAPIHono<{ Bindings: Env }>();

getMeRouter.openapi(getMeConfig, getMeHandler);
