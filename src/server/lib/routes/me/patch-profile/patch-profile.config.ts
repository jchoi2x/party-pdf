import { createRoute } from '@hono/zod-openapi';

import { PatchProfileBodySchema, PatchProfileErrorSchema, PatchProfileResponseSchema } from './schemas';

export const patchProfileConfig = createRoute({
  method: 'patch',
  path: '/me/profile',
  tags: ['User'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: PatchProfileBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated in Auth0',
      content: {
        'application/json': {
          schema: PatchProfileResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: { 'application/json': { schema: PatchProfileErrorSchema } },
    },
    502: {
      description: 'Auth0 Management API error',
      content: { 'application/json': { schema: PatchProfileErrorSchema } },
    },
    503: {
      description: 'Server missing Management API credentials',
      content: { 'application/json': { schema: PatchProfileErrorSchema } },
    },
  },
});

export type PatchProfileConfig = typeof patchProfileConfig;
