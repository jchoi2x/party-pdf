import { OpenAPIHono } from '@hono/zod-openapi';

import { getDocumentsConfig } from './get-documents.config';
import { getDocumentsHandler } from './get-documents.handler';

export const getDocumentsRouter = new OpenAPIHono<{ Bindings: Env }>();

getDocumentsRouter.openapi(getDocumentsConfig, getDocumentsHandler);
