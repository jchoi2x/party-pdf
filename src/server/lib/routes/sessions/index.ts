import { OpenAPIHono } from '@hono/zod-openapi';

import { documentsRepositoryMiddleware } from '../../middleware/repositories';
import { attachDocumentsRouter } from './attach-documents';
import { createSessionRouter } from './create-session';
import { getDocumentsRouter } from './get-documents';
import { getSessionsRouter } from './get-sessions';
import { sessionInviteRouter } from './session-invite';

export const sessionsRouter = new OpenAPIHono<{ Bindings: Env }>();

sessionsRouter.use('*', documentsRepositoryMiddleware);
sessionsRouter.route('', createSessionRouter);
sessionsRouter.route('', attachDocumentsRouter);
sessionsRouter.route('', getDocumentsRouter);
sessionsRouter.route('', getSessionsRouter);
sessionsRouter.route('', sessionInviteRouter);

export * from './session-invite';
