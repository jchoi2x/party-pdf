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

export const DocsByPacketIdResponseSchema = z.object({
  data: z.array(DocumentSchema),
});

export type DocsByPacketIdResponse = z.infer<typeof DocsByPacketIdResponseSchema>;
