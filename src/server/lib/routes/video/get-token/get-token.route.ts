import { OpenAPIHono } from '@hono/zod-openapi';

import { getTokenConfig } from './get-token.config';
import { getTokenHandler } from './get-token.handler';

export const getTokenRouter = new OpenAPIHono<{ Bindings: Env }>();

getTokenRouter.openapi(getTokenConfig, getTokenHandler);
