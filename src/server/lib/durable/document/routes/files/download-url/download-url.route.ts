import { OpenAPIHono } from '@hono/zod-openapi';

import { downloadUrlConfig } from './download-url.config';
import { downloadUrlHandler } from './download-url.handler';

export const downloadUrlRouter = new OpenAPIHono<{ Bindings: Env }>();

downloadUrlRouter.openapi(downloadUrlConfig, downloadUrlHandler);
