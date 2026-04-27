import { z } from '@hono/zod-openapi';

export const DocsByPacketIdParamsSchema = z.object({
  packet_id: z.string().min(1).openapi({
    example: 'f6f2f0d5-3c74-43f6-a9d3-913f85ad4d99',
  }),
});

export type DocsByPacketIdParams = z.infer<typeof DocsByPacketIdParamsSchema>;
