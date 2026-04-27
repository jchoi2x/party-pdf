import { createRoute } from '@hono/zod-openapi';

import {
  SessionInviteBodySchema,
  SessionInviteErrorSchema,
  SessionInviteParamsSchema,
  SessionInviteResponseSchema,
} from './schemas';

export const sessionInviteConfig = createRoute({
  method: 'post',
  path: '/sessions/:session_id/invites',
  tags: ['Session'],
  request: {
    params: SessionInviteParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: SessionInviteBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Invitations processed; emails sent where applicable.',
      content: {
        'application/json': {
          schema: SessionInviteResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: SessionInviteErrorSchema } },
    },
    403: {
      description: 'Session not found or caller is not the session owner',
      content: { 'application/json': { schema: SessionInviteErrorSchema } },
    },
    502: {
      description: 'Auth0 or email provider error',
      content: { 'application/json': { schema: SessionInviteErrorSchema } },
    },
    503: {
      description: 'Auth0 Management API or outbound email is not configured',
      content: { 'application/json': { schema: SessionInviteErrorSchema } },
    },
  },
});

export type SessionInviteConfig = typeof sessionInviteConfig;
