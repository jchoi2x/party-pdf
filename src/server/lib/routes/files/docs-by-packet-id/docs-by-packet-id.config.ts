import { createRoute } from '@hono/zod-openapi';

import { DocsByPacketIdErrorSchema, DocsByPacketIdParamsSchema, DocsByPacketIdResponseSchema } from './schemas';

export const docsByPacketIdConfig = createRoute({
  method: 'get',
  path: '/docs/by-packet-id/:packet_id',
  tags: ['File'],
  request: {
    params: DocsByPacketIdParamsSchema,
  },
  responses: {
    200: {
      description: 'Documents list for a specific packet',
      content: {
        'application/json': {
          schema: DocsByPacketIdResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized response',
      content: {
        'application/json': {
          schema: DocsByPacketIdErrorSchema,
        },
      },
    },
  },
});

export type DocsByPacketIdConfig = typeof docsByPacketIdConfig;
