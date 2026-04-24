import type { RouteHandler } from '@hono/zod-openapi';

import { initS3Client } from '../../../../../utils/s3';

import type { UploadUrlConfig } from './upload-url.config';

export const uploadUrlHandler: RouteHandler<UploadUrlConfig, { Bindings: Env }> = async (c) => {
  const { filename, contentType } = c.req.valid('query');

  const { generateUploadUrl } = initS3Client();

  const { url, id } = await generateUploadUrl({
    prefix: 'collab',
    contentType,
    name: filename,
  });

  return c.json({ url, id }, 200);
};
