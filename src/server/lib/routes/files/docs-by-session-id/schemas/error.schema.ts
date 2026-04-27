import { z } from '@hono/zod-openapi';

export const DocsBySessionIdErrorSchema = z.object({
  error: z.string(),
});

export type DocsBySessionIdError = z.infer<typeof DocsBySessionIdErrorSchema>;
