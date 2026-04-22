import { z } from '@hono/zod-openapi';

export const DownloadUrlErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
});

export type DownloadUrlError = z.infer<typeof DownloadUrlErrorSchema>;

