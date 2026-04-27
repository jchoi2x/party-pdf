import { z } from '@hono/zod-openapi';

export const PatchProfileBodySchema = z
  .object({
    givenName: z.string().min(1).max(150).openapi({ example: 'Ada' }),
    familyName: z.string().min(1).max(150).openapi({ example: 'Lovelace' }),
  })
  .openapi({ description: 'Legal first and last name for the Auth0 user profile' });

export type PatchProfileBody = z.infer<typeof PatchProfileBodySchema>;
