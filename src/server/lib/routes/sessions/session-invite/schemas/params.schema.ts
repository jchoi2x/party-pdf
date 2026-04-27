import { z } from '@hono/zod-openapi';

export const SessionInviteParamsSchema = z.object({
  session_id: z.string().min(1),
});

export type SessionInviteParams = z.infer<typeof SessionInviteParamsSchema>;
