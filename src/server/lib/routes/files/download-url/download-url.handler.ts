import type { RouteHandler } from '@hono/zod-openapi';

import { initS3Client } from '../../../utils/s3';

import type { DownloadUrlConfig } from './download-url.config';

export const downloadUrlHandler: RouteHandler<DownloadUrlConfig, { Bindings: Env }> = async (c) => {
  const { uuid } = c.req.valid('param');

  const { getDownloadUrl } = initS3Client();
  const url = getDownloadUrl({ id: uuid, prefix: 'collab' });

  return c.json({ url }, 200);
};
