import { z } from '@hono/zod-openapi';

export const PatchMeProfileBodySchema = z
  .object({
    givenName: z.string().min(1).max(150).openapi({ example: 'Ada' }),
    familyName: z.string().min(1).max(150).openapi({ example: 'Lovelace' }),
  })
  .openapi({ description: 'Legal first and last name for the Auth0 user profile' });

export type PatchMeProfileBody = z.infer<typeof PatchMeProfileBodySchema>;

export const PatchMeProfileResponseSchema = z.object({
  ok: z.literal(true),
  givenName: z.string(),
  familyName: z.string(),
});

export type PatchMeProfileResponse = z.infer<typeof PatchMeProfileResponseSchema>;
