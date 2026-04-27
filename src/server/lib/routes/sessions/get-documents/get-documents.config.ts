import { createRoute } from '@hono/zod-openapi';

import { GetDocumentsErrorSchema, GetDocumentsParamsSchema, GetDocumentsResponseSchema } from './schemas';

export const getDocumentsConfig = createRoute({
  method: 'get',
  path: '/sessions/:session_id/documents',
  tags: ['Session'],
  request: {
    params: GetDocumentsParamsSchema,
  },
  responses: {
    200: {
      description: 'Documents list for a specific session',
      content: {
        'application/json': {
          schema: GetDocumentsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized response',
      content: {
        'application/json': {
          schema: GetDocumentsErrorSchema,
        },
      },
    },
  },
});

export type GetDocumentsConfig = typeof getDocumentsConfig;
