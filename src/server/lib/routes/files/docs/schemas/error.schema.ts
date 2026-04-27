import { z } from '@hono/zod-openapi';

export const DocsErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export type DocsError = z.infer<typeof DocsErrorSchema>;
