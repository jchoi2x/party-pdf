import type { RouteHandler } from '@hono/zod-openapi';

import type { DocsConfig } from './docs.config';

export const docsHandler: RouteHandler<DocsConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload');
  const ownerId = jwtPayload.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { limit, page } = c.req.valid('query');
  const documentsRepository = c.get('documentsRepository');
  const { data, total, totalPages } = await documentsRepository.getPageByOwner(ownerId, page, limit);

  return c.json(
    {
      data: data.map(({ ownerId: _ownerId, ...doc }) => doc),
      total,
      totalPages,
      page,
      limit,
    },
    200,
  );
};
