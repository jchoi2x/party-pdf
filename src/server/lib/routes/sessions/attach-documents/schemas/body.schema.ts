import { z } from '@hono/zod-openapi';

export const AttachDocumentsBodySchema = z.object({
  documentIds: z.array(z.string()).min(1),
});

export type AttachDocumentsBody = z.infer<typeof AttachDocumentsBodySchema>;
