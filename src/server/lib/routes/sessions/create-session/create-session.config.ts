import { createRoute } from '@hono/zod-openapi';

import { CreateSessionResponseSchema, SessionErrorSchema } from './schemas';

export const createSessionConfig = createRoute({
  method: 'post',
  path: '/sessions',
  tags: ['Session'],
  responses: {
    200: {
      description: 'Create a new session for the current owner',
      content: {
        'application/json': {
          schema: CreateSessionResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized response',
      content: {
        'application/json': {
          schema: SessionErrorSchema,
        },
      },
    },
  },
});

export type CreateSessionConfig = typeof createSessionConfig;
