import { z } from '@hono/zod-openapi';

/** OpenAPI shape for a decoded JWT claims object (Auth0 access token payload). */
export const MeResponseSchema = z.record(z.string(), z.unknown()).openapi({
  description: 'JWT payload claims from the verified access token',
  example: { sub: 'auth0|123', aud: 'https://api.example', iss: 'https://tenant.auth0.com/' },
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
