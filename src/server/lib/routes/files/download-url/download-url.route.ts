import { OpenAPIHono, type RouteHandler } from '@hono/zod-openapi';

import { type DownloadUrlConfig, downloadUrlConfig } from './download-url.config';
import { downloadUrlHandler } from './download-url.handler';

export const downloadUrlRouter = new OpenAPIHono<{ Bindings: Env }>();

downloadUrlRouter.openapi(
  downloadUrlConfig,
  downloadUrlHandler as unknown as RouteHandler<DownloadUrlConfig, { Bindings: Env }>,
);
