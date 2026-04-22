import { z } from '@hono/zod-openapi';

export const GetTokenErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});

export type GetTokenError = z.infer<typeof GetTokenErrorSchema>;

