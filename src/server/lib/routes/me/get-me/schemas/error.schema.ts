import { z } from '@hono/zod-openapi';

export const GetMeErrorSchema = z.object({
  error: z.string(),
});

export type GetMeError = z.infer<typeof GetMeErrorSchema>;
