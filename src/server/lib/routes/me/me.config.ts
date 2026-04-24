import { createRoute } from '@hono/zod-openapi';

import { MeResponseSchema } from './schemas';

export const meConfig = createRoute({
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
  },
});

export type MeConfig = typeof meConfig;
export type GetMeConfig = typeof meConfig;
