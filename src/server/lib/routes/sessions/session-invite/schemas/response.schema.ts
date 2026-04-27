import { z } from '@hono/zod-openapi';

const SentSchema = z.object({
  email: z.string().email(),
  kind: z.enum(['existing_user', 'pending_registration']),
});

const SkippedSchema = z.object({
  email: z.string(),
  reason: z.enum(['invalid_email', 'self_invite']),
});

export const SessionInviteResponseSchema = z.object({
  sent: z.array(SentSchema),
  skipped: z.array(SkippedSchema),
});

export type SessionInviteResponse = z.infer<typeof SessionInviteResponseSchema>;
