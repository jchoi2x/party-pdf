import { OpenAPIHono } from '@hono/zod-openapi';

import { getTokenRouter } from './get-token/get-token.route';

export const videosRouter = new OpenAPIHono<{ Bindings: Env }>();

videosRouter.route('', getTokenRouter);
