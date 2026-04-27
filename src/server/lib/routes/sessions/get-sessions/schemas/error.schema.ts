import { z } from '@hono/zod-openapi';

export const SessionsErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export type SessionsError = z.infer<typeof SessionsErrorSchema>;
