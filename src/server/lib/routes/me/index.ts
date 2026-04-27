import { OpenAPIHono } from '@hono/zod-openapi';

import { getMeRouter } from './get-me/get-me.route';
import { patchProfileRouter } from './patch-profile/patch-profile.route';

export const meRouter = new OpenAPIHono<{ Bindings: Env }>();

meRouter.route('', getMeRouter);
meRouter.route('', patchProfileRouter);

export * from './get-me';
export * from './patch-profile';
