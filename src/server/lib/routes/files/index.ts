import { OpenAPIHono } from '@hono/zod-openapi';

import { downloadUrlRouter } from './download-url/download-url.route';
import { uploadUrlRouter } from './upload-url/upload-url.route';

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

filesRouter.route('', downloadUrlRouter).route('', uploadUrlRouter);

export * from './download-url';
export * from './upload-url';
