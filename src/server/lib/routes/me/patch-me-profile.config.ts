import { createRoute, z } from '@hono/zod-openapi';

import { PatchMeProfileBodySchema, PatchMeProfileResponseSchema } from './schemas/patch-profile.schema';

const PatchMeProfileErrorSchema = z.object({ error: z.string() });

export const patchMeProfileConfig = createRoute({
  method: 'patch',
  path: '/me/profile',
  tags: ['User'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: PatchMeProfileBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated in Auth0',
      content: {
        'application/json': {
          schema: PatchMeProfileResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: { 'application/json': { schema: PatchMeProfileErrorSchema } },
    },
    502: {
      description: 'Auth0 Management API error',
      content: { 'application/json': { schema: PatchMeProfileErrorSchema } },
    },
    503: {
      description: 'Server missing Management API credentials',
      content: { 'application/json': { schema: PatchMeProfileErrorSchema } },
    },
  },
});

export type PatchMeProfileConfig = typeof patchMeProfileConfig;
