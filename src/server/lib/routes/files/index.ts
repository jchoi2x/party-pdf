import { OpenAPIHono } from '@hono/zod-openapi';

import { documentsRepositoryMiddleware } from '../../middleware/repositories';
import { uploadUrlRouter } from './upload-url/upload-url.route';

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

filesRouter.use('*', documentsRepositoryMiddleware);
filesRouter.route('', uploadUrlRouter);
