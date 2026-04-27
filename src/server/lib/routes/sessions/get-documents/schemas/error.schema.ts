import { z } from '@hono/zod-openapi';

export const GetDocumentsErrorSchema = z.object({
  error: z.string(),
});

export type GetDocumentsError = z.infer<typeof GetDocumentsErrorSchema>;
