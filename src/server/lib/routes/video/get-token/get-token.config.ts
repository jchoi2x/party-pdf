import { createRoute } from '@hono/zod-openapi';

import { GetTokenErrorSchema, GetTokenRequestBodySchema, GetTokenResponseBodySchema } from './schemas';

export const getTokenConfig = createRoute({
  method: 'post',
  path: '/token',
  tags: ['Video'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: GetTokenRequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Upload URL',
      content: {
        'application/json': {
          schema: GetTokenResponseBodySchema,
        },
      },
    },
    400: {
      description: 'Error response',
      content: {
        'application/json': {
          schema: GetTokenErrorSchema,
        },
      },
    },
  },
});

export type GetTokenConfig = typeof getTokenConfig;
