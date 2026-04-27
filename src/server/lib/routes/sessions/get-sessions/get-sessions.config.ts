import { createRoute } from '@hono/zod-openapi';

import { SessionsErrorSchema, SessionsQuerySchema, SessionsResponseSchema } from './schemas';

export const getSessionsConfig = createRoute({
  method: 'get',
  path: '/sessions',
  tags: ['Session'],
  request: {
    query: SessionsQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated sessions list with documents and participants for the current owner',
      content: {
        'application/json': {
          schema: SessionsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized response',
      content: {
        'application/json': {
          schema: SessionsErrorSchema,
        },
      },
    },
  },
});

export type GetSessionsConfig = typeof getSessionsConfig;
