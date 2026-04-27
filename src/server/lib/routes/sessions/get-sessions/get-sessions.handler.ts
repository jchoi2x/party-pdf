import type { RouteHandler } from '@hono/zod-openapi';

import type { GetSessionsConfig } from './get-sessions.config';

export const getSessionsHandler: RouteHandler<GetSessionsConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload') as { sub?: string } | undefined;
  const ownerId = jwtPayload?.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { limit, page } = c.req.valid('query');
  const documentsRepository = c.get('documentsRepository');
  const { data, total, totalPages } = await documentsRepository.getSessionsWithDetailsPageByOwner(ownerId, page, limit);

  return c.json(
    {
      data,
      total,
      totalPages,
      page,
      limit,
    },
    200,
  );
};
