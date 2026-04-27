import 'hono';
import type { JWTPayload } from 'jose';
import type { createDocumentsRepository } from './lib/db/documents.repository';

declare module 'hono' {
  interface ContextVariableMap {
    jwtPayload: JWTPayload;
    documentsRepository: ReturnType<typeof createDocumentsRepository>;
  }
}
