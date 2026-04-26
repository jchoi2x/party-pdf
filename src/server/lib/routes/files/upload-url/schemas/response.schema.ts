import { z } from '@hono/zod-openapi';

export const UploadUrlResponseSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string().describe('Generated document id'),
        filename: z.string().describe('Original filename'),
        url: z.string().describe('Pre-signed upload URL'),
        bucketPath: z.string().describe('R2 object path'),
      }),
    )
    .describe('Pre-signed upload URLs for each requested file'),
  collab_session_id: z.string().describe('Collaboration session id for the uploaded files batch'),
});

export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;
