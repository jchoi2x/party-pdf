import type { RouteHandler } from '@hono/zod-openapi';

import type { GetMeConfig } from './get-me.config';

export const getMeHandler: RouteHandler<GetMeConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload') as Record<string, unknown> | undefined;
  if (!jwtPayload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return c.json(jwtPayload as Record<string, unknown>, 200);
};
