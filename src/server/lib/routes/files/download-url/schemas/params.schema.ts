import { z } from '@hono/zod-openapi';

export const DownloadUrlParamsSchema = z.object({
	uuid: z.string().describe('UUID of the file'),
});

export type DownloadUrlParams = z.infer<typeof DownloadUrlParamsSchema>;

