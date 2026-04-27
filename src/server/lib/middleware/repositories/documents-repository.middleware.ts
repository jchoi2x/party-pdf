import { createFactory } from 'hono/factory';

import { createDocumentsRepository } from '../../db/documents.repository';

const factory = createFactory<{ Bindings: Env }>();

export const documentsRepositoryMiddleware = factory.createMiddleware(async (c, next) => {
  c.set('documentsRepository', createDocumentsRepository(c.env));
  await next();
});
