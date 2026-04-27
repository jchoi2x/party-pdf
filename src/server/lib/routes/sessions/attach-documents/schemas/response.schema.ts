import { z } from '@hono/zod-openapi';

export const AttachDocumentsResponseSchema = z.object({
  sessionId: z.string(),
  attachedCount: z.number().int(),
  attachedIds: z.array(z.string()),
});

export type AttachDocumentsResponse = z.infer<typeof AttachDocumentsResponseSchema>;
