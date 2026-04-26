import { createRoute } from '@hono/zod-openapi';

import { GetTokenErrorSchema } from './schemas/errors.schemas';
import { GetTokenRequestBodySchema, GetTokenResponseBodySchema } from './schemas/get-token.schemas';

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
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: GetTokenErrorSchema,
        },
      },
    },
  },
});

export type GetTokenConfig = typeof getTokenConfig;
