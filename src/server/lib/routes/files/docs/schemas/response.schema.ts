import { z } from '@hono/zod-openapi';

const DocumentSchema = z.object({
  id: z.string(),
  packetId: z.string(),
  filename: z.string(),
  url: z.string(),
  downloadUrl: z.string(),
  bucketPath: z.string(),
  createdAt: z.string(),
  status: z.enum(['pending', 'ready']),
});

export const DocsResponseSchema = z.object({
  data: z.array(DocumentSchema),
  total: z.number().int(),
  totalPages: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export type DocsResponse = z.infer<typeof DocsResponseSchema>;
