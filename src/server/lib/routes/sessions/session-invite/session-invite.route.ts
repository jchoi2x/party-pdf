import { OpenAPIHono, type RouteHandler } from '@hono/zod-openapi';

import { sessionInviteConfig } from './session-invite.config';
import { sessionInviteHandler } from './session-invite.handler';

export const sessionInviteRouter = new OpenAPIHono<{ Bindings: Env }>();

sessionInviteRouter.openapi(
  sessionInviteConfig,
  sessionInviteHandler as unknown as RouteHandler<typeof sessionInviteConfig, { Bindings: Env }>,
);
