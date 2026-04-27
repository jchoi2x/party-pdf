import { OpenAPIHono } from '@hono/zod-openapi';

import { documentsRepositoryMiddleware } from '../../middleware/repositories';
import { docsRouter } from './docs/docs.route';
import { docsByPacketIdRouter } from './docs-by-packet-id/docs-by-packet-id.route';
import { uploadUrlRouter } from './upload-url/upload-url.route';

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

filesRouter.use('*', documentsRepositoryMiddleware);
filesRouter.route('', docsByPacketIdRouter);
filesRouter.route('', docsRouter);
filesRouter.route('', uploadUrlRouter);
