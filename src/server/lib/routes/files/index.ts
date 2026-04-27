import { OpenAPIHono } from '@hono/zod-openapi';

import { documentsRepositoryMiddleware } from '../../middleware/repositories';
import { docsRouter } from './docs/docs.route';
import { docsBySessionIdRouter } from './docs-by-session-id/docs-by-session-id.route';
import { uploadUrlRouter } from './upload-url/upload-url.route';

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

filesRouter.use('*', documentsRepositoryMiddleware);
filesRouter.route('', docsBySessionIdRouter);
filesRouter.route('', docsRouter);
filesRouter.route('', uploadUrlRouter);
