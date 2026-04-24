import { z } from '@hono/zod-openapi';

export const UploadUrlQuerySchema = z.object({
  filenames: z
    .preprocess((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      return value;
    }, z.array(z.string()).min(1))
    .describe('Names of files to upload'),
  contentType: z.string().describe('MIME type of the file').openapi({
    example: 'application/pdf',
  }),
});

export type UploadUrlQuery = z.infer<typeof UploadUrlQuerySchema>;
