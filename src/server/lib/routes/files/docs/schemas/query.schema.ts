import { z } from '@hono/zod-openapi';

export const DocsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).default(10).openapi({
    example: 10,
  }),
  page: z.coerce.number().int().min(1).default(1).openapi({
    example: 1,
  }),
});

export type DocsQuery = z.infer<typeof DocsQuerySchema>;
