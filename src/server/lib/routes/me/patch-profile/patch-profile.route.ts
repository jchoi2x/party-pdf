import { OpenAPIHono } from '@hono/zod-openapi';

import { patchProfileConfig } from './patch-profile.config';
import { patchProfileHandler } from './patch-profile.handler';

export const patchProfileRouter = new OpenAPIHono<{ Bindings: Env }>();

patchProfileRouter.openapi(patchProfileConfig, patchProfileHandler);
