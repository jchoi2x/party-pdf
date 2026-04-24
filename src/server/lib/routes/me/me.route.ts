import { OpenAPIHono } from '@hono/zod-openapi';

import { meConfig } from './me.config';
import { meHandler } from './me.handler';
import { patchMeProfileConfig } from './patch-me-profile.config';
import { patchMeProfileHandler } from './patch-me-profile.handler';

export const meRouter = new OpenAPIHono<{ Bindings: Env }>();

meRouter.openapi(meConfig, meHandler);
meRouter.openapi(patchMeProfileConfig, patchMeProfileHandler);
