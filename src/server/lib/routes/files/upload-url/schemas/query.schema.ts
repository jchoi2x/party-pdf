import { z } from '@hono/zod-openapi';

export const UploadUrlQuerySchema = z.object({
  filename: z.string().describe('Name of the file to upload'),
  contentType: z.string().describe('MIME type of the file').openapi({
    example: 'application/pdf',
  }),
});

export type UploadUrlQuery = z.infer<typeof UploadUrlQuerySchema>;
