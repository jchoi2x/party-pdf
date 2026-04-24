import type { RouteHandler } from '@hono/zod-openapi';

import type { GetMeConfig } from './me.config';

export const meHandler: RouteHandler<GetMeConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload');
  return c.json(jwtPayload as Record<string, unknown>, 200);
};
