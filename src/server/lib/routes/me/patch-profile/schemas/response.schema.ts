import { z } from '@hono/zod-openapi';

export const PatchProfileResponseSchema = z.object({
  ok: z.literal(true),
  givenName: z.string(),
  familyName: z.string(),
});

export type PatchProfileResponse = z.infer<typeof PatchProfileResponseSchema>;
