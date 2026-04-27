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
  const responseData = data.map(({ session, documents, participants }) => ({
    session,
    documents: documents.flatMap(({ ownerId: _ownerId, sessionId, ...doc }) =>
      sessionId ? [{ ...doc, sessionId }] : [],
    ),
    participants,
  }));

  return c.json(
    {
      data: responseData,
      total,
      totalPages,
      page,
      limit,
    },
    200,
  );
};
