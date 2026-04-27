import { and, desc, eq, sql } from 'drizzle-orm';

import { getDb } from './index';
import { documents, type Document, type NewDocument } from './schema';

export interface DocumentsPage {
  data: Document[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export const createDocumentsRepository = (env: Env) => {
  const db = getDb(env);

  return {
    async createMany(rows: NewDocument[]) {
      if (rows.length === 0) {
        return;
      }
      await db.insert(documents).values(rows);
    },

    async getByOwnerAndPacket(ownerId: string, packetId: string) {
      return db
        .select()
        .from(documents)
        .where(and(eq(documents.ownerId, ownerId), eq(documents.packetId, packetId)))
        .orderBy(desc(documents.createdAt));
    },

    async getPageByOwner(ownerId: string, page: number, limit: number): Promise<DocumentsPage> {
      const offset = (page - 1) * limit;
      const [countRow] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(documents)
        .where(eq(documents.ownerId, ownerId));
      const total = countRow?.count ?? 0;
      const totalPages = Math.ceil(total / limit);

      const data = await db
        .select()
        .from(documents)
        .where(eq(documents.ownerId, ownerId))
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data,
        total,
        totalPages,
        page,
        limit,
      };
    },
  };
};

