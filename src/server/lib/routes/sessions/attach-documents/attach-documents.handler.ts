import type { RouteHandler } from '@hono/zod-openapi';

import type { AttachDocumentsConfig } from './attach-documents.config';

export const attachDocumentsHandler: RouteHandler<AttachDocumentsConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload') as { sub?: string } | undefined;
  const ownerId = jwtPayload?.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { session_id: sessionId } = c.req.valid('param');
  const { documentIds } = c.req.valid('json');

  const documentsRepository = c.get('documentsRepository');
  const session = await documentsRepository.getSessionIfOwnedBy(sessionId, ownerId);
  if (!session) {
    return c.json({ error: 'Session not found or you do not have permission to modify it.' }, 403);
  }

  const { attachedCount, attachedIds } = await documentsRepository.attachDocumentsToSession(
    ownerId,
    sessionId,
    documentIds,
  );

  return c.json(
    {
      sessionId,
      attachedCount,
      attachedIds,
    },
    200,
  );
};
