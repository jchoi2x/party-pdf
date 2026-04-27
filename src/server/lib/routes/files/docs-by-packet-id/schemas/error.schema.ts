import { z } from '@hono/zod-openapi';

export const DocsByPacketIdErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export type DocsByPacketIdError = z.infer<typeof DocsByPacketIdErrorSchema>;
