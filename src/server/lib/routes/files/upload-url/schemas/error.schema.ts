import { z } from '@hono/zod-openapi';

export const UploadUrlErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});

export type UploadUrlError = z.infer<typeof UploadUrlErrorSchema>;

