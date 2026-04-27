import { z } from '@hono/zod-openapi';

export const SessionErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export type SessionError = z.infer<typeof SessionErrorSchema>;
