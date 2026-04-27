import { sql } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable(
  'documents',
  {
    id: text('id')
      .primaryKey()
      .default(sql`(lower(hex(randomblob(16))))`),
    ownerId: text('owner_id').notNull(),
    packetId: text('packet_id').notNull(),
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
    ownerPacketIdx: index('documents_owner_packet_idx').on(table.ownerId, table.packetId),
    createdAtIdx: index('documents_created_at_idx').on(table.createdAt),
  }),
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
