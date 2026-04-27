import { z } from '@hono/zod-openapi';

export const CreateSessionResponseSchema = z.object({
  id: z.string(),
});

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
