import { OpenAPIHono } from '@hono/zod-openapi';

import { createDocumentsRepository } from '../../db/documents.repository';
import { toDocumentResponse } from './documents.mapper';
import { uploadUrlRouter } from './upload-url/upload-url.route';

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

filesRouter.get('/docs/by-packet-id/:packet_id', async (c) => {
  const jwtPayload = c.get('jwtPayload');
  const ownerId = jwtPayload.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const packetId = c.req.param('packet_id');
  const documentsRepository = createDocumentsRepository(c.env);
  const data = await documentsRepository.getByOwnerAndPacket(ownerId, packetId);

  return c.json(
    {
      data: data.map(toDocumentResponse),
    },
    200,
  );
});

filesRouter.get('/docs', async (c) => {
  const jwtPayload = c.get('jwtPayload');
  const ownerId = jwtPayload.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { limit: rawLimit = 10, page: rawPage = 1 } = c.req.query() as unknown as {
    limit: number;
    page: number;
  };
  const limit = Number.parseInt(rawLimit as unknown as string, 10);
  const page = Number.parseInt(rawPage as unknown as string, 10);
  const documentsRepository = createDocumentsRepository(c.env);
  const { data, total, totalPages } = await documentsRepository.getPageByOwner(ownerId, page, limit);

  return c.json(
    {
      data: data.map(toDocumentResponse),
      total,
      totalPages,
      page,
      limit,
    },
    200,
  );
});

filesRouter.route('', uploadUrlRouter);

