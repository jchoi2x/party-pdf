import { z } from '@hono/zod-openapi';

export const AttachDocumentsParamsSchema = z.object({
  session_id: z.string(),
});

export type AttachDocumentsParams = z.infer<typeof AttachDocumentsParamsSchema>;
