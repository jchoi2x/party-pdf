import { createRoute } from '@hono/zod-openapi';

import {
  AttachDocumentsBodySchema,
  AttachDocumentsParamsSchema,
  AttachDocumentsResponseSchema,
  SessionErrorSchema,
} from './schemas';

export const attachDocumentsConfig = createRoute({
  method: 'post',
  path: '/sessions/:session_id/documents',
  tags: ['Session'],
  request: {
    params: AttachDocumentsParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: AttachDocumentsBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Attach uploaded documents to a session',
      content: {
        'application/json': {
          schema: AttachDocumentsResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: SessionErrorSchema } },
    },
    403: {
      description: 'Session not found or not owned by caller',
      content: { 'application/json': { schema: SessionErrorSchema } },
    },
  },
});

export type AttachDocumentsConfig = typeof attachDocumentsConfig;
