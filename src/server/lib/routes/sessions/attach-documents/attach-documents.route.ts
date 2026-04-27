import { OpenAPIHono } from '@hono/zod-openapi';

import { attachDocumentsConfig } from './attach-documents.config';
import { attachDocumentsHandler } from './attach-documents.handler';

export const attachDocumentsRouter = new OpenAPIHono<{ Bindings: Env }>();

attachDocumentsRouter.openapi(attachDocumentsConfig, attachDocumentsHandler);
