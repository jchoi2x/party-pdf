import type { RouteHandler } from '@hono/zod-openapi';

import type { DocsByPacketIdConfig } from './docs-by-packet-id.config';

export const docsByPacketIdHandler: RouteHandler<DocsByPacketIdConfig, { Bindings: Env }> = async (c) => {
  const jwtPayload = c.get('jwtPayload');
  const ownerId = jwtPayload.sub;
  if (!ownerId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { packet_id: packetId } = c.req.valid('param');
  const documentsRepository = c.get('documentsRepository');
  const data = await documentsRepository.getByOwnerAndPacket(ownerId, packetId);

  return c.json(
    {
      data: data.map(({ ownerId: _ownerId, ...doc }) => doc),
    },
    200,
  );
};
