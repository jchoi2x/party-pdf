import { OpenAPIHono } from '@hono/zod-openapi';

import { uploadUrlConfig } from './upload-url.config';
import { uploadUrlHandler } from './upload-url.handler';

export const uploadUrlRouter = new OpenAPIHono<{ Bindings: Env }>();

uploadUrlRouter.openapi(uploadUrlConfig, uploadUrlHandler);
