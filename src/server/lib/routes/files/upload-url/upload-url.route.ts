import { OpenAPIHono, type RouteHandler } from '@hono/zod-openapi';

import { type UploadUrlConfig, uploadUrlConfig } from './upload-url.config';
import { uploadUrlHandler } from './upload-url.handler';

export const uploadUrlRouter = new OpenAPIHono<{ Bindings: Env }>();

uploadUrlRouter.openapi(
  uploadUrlConfig,
  uploadUrlHandler as unknown as RouteHandler<UploadUrlConfig, { Bindings: Env }>,
);
