import { createRoute } from '@hono/zod-openapi';

import { DocsBySessionIdErrorSchema, DocsBySessionIdParamsSchema, DocsBySessionIdResponseSchema } from './schemas';

export const docsBySessionIdConfig = createRoute({
  method: 'get',
  path: '/docs/by-session-id/:session_id',
  tags: ['File'],
  request: {
    params: DocsBySessionIdParamsSchema,
  },
  responses: {
    200: {
      description: 'Documents list for a specific session',
      content: {
        'application/json': {
          schema: DocsBySessionIdResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized response',
      content: {
        'application/json': {
          schema: DocsBySessionIdErrorSchema,
        },
      },
    },
  },
});

export type DocsBySessionIdConfig = typeof docsBySessionIdConfig;
