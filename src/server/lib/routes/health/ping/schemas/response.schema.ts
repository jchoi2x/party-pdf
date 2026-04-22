import { z } from '@hono/zod-openapi';

export const PingResponseSchema = z.object({
	message: z
		.string()
		.default('pong')
		.describe('The pong message'),
});

export type PingResponse = z.infer<typeof PingResponseSchema>;
