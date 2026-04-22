import { z } from '@hono/zod-openapi';

export const PingErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});

export type PingError = z.infer<typeof PingErrorSchema>;

