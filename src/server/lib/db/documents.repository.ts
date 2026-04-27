import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from './index';
import {
  type Document,
  documents,
  type NewDocument,
  type Participant,
  participants,
  type Session,
  sessions,
} from './schema';

export interface DocumentsPage {
  data: Document[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface SessionsWithDetailsPage {
  data: Array<{
    session: Session;
    documents: Document[];
    participants: Participant[];
  }>;
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface IDocumentsRepository {
  createSessionWithLeader(ownerId: string): Promise<string>;
  createMany(rows: NewDocument[]): Promise<void>;
  getByOwnerAndSession(ownerId: string, sessionId: string): Promise<Document[]>;
  getPageByOwner(ownerId: string, page: number, limit: number): Promise<DocumentsPage>;
  getSessionsWithDetailsPageByOwner(ownerId: string, page: number, limit: number): Promise<SessionsWithDetailsPage>;
  getSessionIfOwnedBy(sessionId: string, ownerId: string): Promise<{ id: string } | null>;
  addParticipantMember(sessionId: string, userId: string): Promise<void>;
  attachDocumentsToSession(
    ownerId: string,
    sessionId: string,
    documentIds: string[],
  ): Promise<{ attachedCount: number; attachedIds: string[] }>;
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

  async getSessionIfOwnedBy(sessionId: string, ownerId: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.ownerId, ownerId)))
      .limit(1);
    return row ?? null;
  }

  async addParticipantMember(sessionId: string, userId: string): Promise<void> {
    const createdAt = Date.now().toString();
    await this.db
      .insert(participants)
      .values({
        sessionId,
        userId,
        role: 'member',
        createdAt,
      })
      .onConflictDoNothing({ target: [participants.sessionId, participants.userId] });
  }

  async attachDocumentsToSession(
    ownerId: string,
    sessionId: string,
    documentIds: string[],
  ): Promise<{ attachedCount: number; attachedIds: string[] }> {
    if (documentIds.length === 0) {
      return { attachedCount: 0, attachedIds: [] };
    }

    const updated = await this.db
      .update(documents)
      .set({ sessionId })
      .where(and(eq(documents.ownerId, ownerId), inArray(documents.id, documentIds)))
      .returning({ id: documents.id });

    return {
      attachedCount: updated.length,
      attachedIds: updated.map((row) => row.id),
    };
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

  async getSessionsWithDetailsPageByOwner(
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<SessionsWithDetailsPage> {
    const offset = (page - 1) * limit;

    const [countRow] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(sessions)
      .where(eq(sessions.ownerId, ownerId));

    const total = countRow?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const pagedSessions = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.ownerId, ownerId))
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset);

    const sessionIds = pagedSessions.map((session) => session.id);

    if (sessionIds.length === 0) {
      return {
        data: [],
        total,
        totalPages,
        page,
        limit,
      };
    }

    const sessionDocuments = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.ownerId, ownerId), inArray(documents.sessionId, sessionIds)))
      .orderBy(desc(documents.createdAt));

    const sessionParticipants = await this.db
      .select()
      .from(participants)
      .where(inArray(participants.sessionId, sessionIds))
      .orderBy(desc(participants.createdAt));

    const documentsBySession = new Map<string, Document[]>();
    for (const doc of sessionDocuments) {
      if (!doc.sessionId) {
        continue;
      }
      const row = documentsBySession.get(doc.sessionId) ?? [];
      row.push(doc);
      documentsBySession.set(doc.sessionId, row);
    }

    const participantsBySession = new Map<string, Participant[]>();
    for (const participant of sessionParticipants) {
      const row = participantsBySession.get(participant.sessionId) ?? [];
      row.push(participant);
      participantsBySession.set(participant.sessionId, row);
    }

    return {
      data: pagedSessions.map((session) => ({
        session,
        documents: documentsBySession.get(session.id) ?? [],
        participants: participantsBySession.get(session.id) ?? [],
      })),
      total,
      totalPages,
      page,
      limit,
    };
  }
}

export const createDocumentsRepository = (env: Env): IDocumentsRepository => {
  return new DocumentsRepository(env);
};
