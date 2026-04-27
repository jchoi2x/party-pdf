import { z } from '@hono/zod-openapi';

export const SessionInviteBodySchema = z.object({
  emails: z.array(z.string()).min(1),
});

export type SessionInviteBody = z.infer<typeof SessionInviteBodySchema>;
