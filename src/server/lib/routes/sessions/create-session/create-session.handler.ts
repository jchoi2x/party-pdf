import type { RouteHandler } from '@hono/zod-openapi';

import type { CreateSessionConfig } from './create-session.config';

export const createSessionHandler: RouteHandler<CreateSessionConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload') as { sub?: string } | undefined;
  const ownerId = jwtPayload?.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const documentsRepository = c.get('documentsRepository');
  const id = await documentsRepository.createSessionWithLeader(ownerId);
  return c.json({ id }, 200);
};
