import { createRoute } from '@hono/zod-openapi';

import { GetMeErrorSchema, MeResponseSchema } from './schemas';

export const getMeConfig = createRoute({
  method: 'get',
  path: '/me',
  tags: ['User'],
  responses: {
    200: {
      description: 'Decoded access token payload for the current bearer',
      content: {
        'application/json': {
          schema: MeResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: GetMeErrorSchema,
        },
      },
    },
  },
});

export type GetMeConfig = typeof getMeConfig;
