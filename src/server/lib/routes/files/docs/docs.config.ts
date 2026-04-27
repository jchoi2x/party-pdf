import { createRoute } from '@hono/zod-openapi';

import { DocsErrorSchema, DocsQuerySchema, DocsResponseSchema } from './schemas';

export const docsConfig = createRoute({
  method: 'get',
  path: '/docs',
  tags: ['File'],
  request: {
    query: DocsQuerySchema,
  },
  responses: {
    200: {
      description: 'Paginated documents list for the current owner',
      content: {
        'application/json': {
          schema: DocsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized response',
      content: {
        'application/json': {
          schema: DocsErrorSchema,
        },
      },
    },
  },
});

export type DocsConfig = typeof docsConfig;
