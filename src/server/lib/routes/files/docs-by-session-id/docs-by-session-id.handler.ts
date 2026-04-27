import type { RouteHandler } from '@hono/zod-openapi';

import type { DocsBySessionIdConfig } from './docs-by-session-id.config';

export const docsBySessionIdHandler: RouteHandler<DocsBySessionIdConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload');
  const ownerId = jwtPayload.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { session_id: sessionId } = c.req.valid('param');
  const documentsRepository = c.get('documentsRepository');
  const data = await documentsRepository.getByOwnerAndSession(ownerId, sessionId);

  return c.json(
    {
      data: data.map(({ ownerId: _ownerId, ...doc }) => doc),
    },
    200,
  );
};
