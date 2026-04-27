import type { RouteHandler } from '@hono/zod-openapi';

import type { GetDocumentsConfig } from './get-documents.config';

export const getDocumentsHandler: RouteHandler<GetDocumentsConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload') as { sub?: string } | undefined;
  const ownerId = jwtPayload?.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { session_id: sessionId } = c.req.valid('param');
  const documentsRepository = c.get('documentsRepository');
  const data = await documentsRepository.getByOwnerAndSession(ownerId, sessionId);
  const responseData = data.flatMap(({ ownerId: _ownerId, sessionId: repositorySessionId, ...doc }) =>
    repositorySessionId ? [{ ...doc, sessionId: repositorySessionId }] : [],
  );

  return c.json(
    {
      data: responseData,
    },
    200,
  );
};
