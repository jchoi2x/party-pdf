import { z } from '@hono/zod-openapi';

export const DownloadUrlResponseSchema = z.object({
	url: z.string().describe('The file download URL'),
});

export type DownloadUrlResponse = z.infer<typeof DownloadUrlResponseSchema>;

