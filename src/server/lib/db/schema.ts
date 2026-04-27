import { sql } from 'drizzle-orm';
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .default(sql`(lower(hex(randomblob(16))))`),
    ownerId: text('owner_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    ownerIdIdx: index('sessions_owner_id_idx').on(table.ownerId),
    createdAtIdx: index('sessions_created_at_idx').on(table.createdAt),
  }),
);

export const participants = sqliteTable(
  'participants',
  {
    id: text('id')
      .primaryKey()
      .default(sql`(lower(hex(randomblob(16))))`),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role', { enum: ['leader', 'member'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    sessionIdIdx: index('participants_session_id_idx').on(table.sessionId),
    userIdIdx: index('participants_user_id_idx').on(table.userId),
    sessionUserUniqueIdx: uniqueIndex('participants_session_user_unique_idx').on(table.sessionId, table.userId),
  }),
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id')
      .primaryKey()
      .default(sql`(lower(hex(randomblob(16))))`),
    ownerId: text('owner_id').notNull(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    url: text('url').notNull(),
    downloadUrl: text('download_url').notNull(),
    bucketPath: text('bucket_path').notNull(),
    createdAt: text('created_at').notNull(),
    status: text('status', { enum: ['pending', 'ready'] })
      .notNull()
      .default('pending'),
  },
  (table) => ({
    ownerIdIdx: index('documents_owner_id_idx').on(table.ownerId),
    sessionIdIdx: index('documents_session_id_idx').on(table.sessionId),
    ownerSessionIdx: index('documents_owner_session_idx').on(table.ownerId, table.sessionId),
    createdAtIdx: index('documents_created_at_idx').on(table.createdAt),
  }),
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
