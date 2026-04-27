import { z } from '@hono/zod-openapi';

export const SessionInviteErrorSchema = z.object({
  error: z.string(),
});

export type SessionInviteError = z.infer<typeof SessionInviteErrorSchema>;
