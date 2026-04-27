import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from './index';
import { type Document, documents, participants, type NewDocument, sessions } from './schema';

export interface DocumentsPage {
  data: Document[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

interface IDocumentsRepository {
  createSessionWithLeader(ownerId: string): Promise<string>;
  createMany(rows: NewDocument[]): Promise<void>;
  getByOwnerAndSession(ownerId: string, sessionId: string): Promise<Document[]>;
  getPageByOwner(ownerId: string, page: number, limit: number): Promise<DocumentsPage>;
}

class DocumentsRepository implements IDocumentsRepository {
  private db: ReturnType<typeof getDb>;
  constructor(env: Env) {
    this.db = getDb(env);
  }

  async createSessionWithLeader(ownerId: string): Promise<string> {
    const createdAt = Date.now().toString();
    const [session] = await this.db
      .insert(sessions)
      .values({
        ownerId,
        createdAt,
      })
      .returning({ id: sessions.id });
    if (!session?.id) {
      throw new Error('Failed to create session.');
    }
    await this.db.insert(participants).values({
      sessionId: session.id,
      userId: ownerId,
      role: 'leader',
      createdAt,
    });
    return session.id;
  }

  async createMany(rows: NewDocument[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.db.insert(documents).values(rows);
  }

  async getByOwnerAndSession(ownerId: string, sessionId: string): Promise<Document[]> {
    return this.db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerId, ownerId), eq(documents.sessionId, sessionId)))
      .orderBy(desc(documents.createdAt));
  }

  async getPageByOwner(ownerId: string, page: number, limit: number): Promise<DocumentsPage> {
    const offset = (page - 1) * limit;

    const [countRow] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(documents)
      .where(eq(documents.ownerId, ownerId));

    const total = countRow?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const data = await this.db
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
  }
}

export const createDocumentsRepository = (env: Env) => {
  return new DocumentsRepository(env);
};
