import { z } from '@hono/zod-openapi';

export const UploadUrlResponseSchema = z.object({
	url: z
		.string()
		.default('http://localhost:3000/api/upload-url')
		.describe('The pre-signed upload URL'),
	id: z.string().describe('The id of the uploaded file you can use to fetch the download url'),
});

export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;

