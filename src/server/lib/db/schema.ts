import { relations, sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const collabParticipantRoleEnum = pgEnum('collab_participant_role', ['owner', 'participant']);
export const collabInviteStatusEnum = pgEnum('collab_invite_status', ['pending', 'sent', 'accepted', 'failed']);
export const collabDocumentStatusEnum = pgEnum('collab_document_status', ['pending', 'ready', 'failed']);
export const collabSessionStatusEnum = pgEnum('collab_session_status', ['active', 'archived']);
export const collabInviteDeliveryStatusEnum = pgEnum('collab_invite_delivery_status', ['pending', 'sent', 'failed']);

export const collabSessionsTable = pgTable(
  'collab_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserSub: text('owner_user_sub').notNull(),
    title: text('title'),
    status: collabSessionStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('collab_sessions_owner_user_sub_idx').on(table.ownerUserSub)],
);

export const collabSessionParticipantsTable = pgTable(
  'collab_session_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collabSessionId: uuid('collab_session_id')
      .notNull()
      .references(() => collabSessionsTable.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    userSub: text('user_sub'),
    role: collabParticipantRoleEnum('role').notNull().default('participant'),
    inviteStatus: collabInviteStatusEnum('invite_status').notNull().default('pending'),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('collab_session_participants_session_email_unq').on(table.collabSessionId, table.email),
    uniqueIndex('collab_session_participants_session_user_sub_unq')
      .on(table.collabSessionId, table.userSub)
      .where(sql`${table.userSub} IS NOT NULL`),
    index('collab_session_participants_session_idx').on(table.collabSessionId),
    index('collab_session_participants_user_sub_idx').on(table.userSub),
    index('collab_session_participants_email_idx').on(table.email),
  ],
);

export const collabSessionDocumentsTable = pgTable(
  'collab_session_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collabSessionId: uuid('collab_session_id')
      .notNull()
      .references(() => collabSessionsTable.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    bucketPath: text('bucket_path').notNull(),
    uploadUrl: text('upload_url').notNull(),
    downloadUrl: text('download_url').notNull(),
    status: collabDocumentStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('collab_session_documents_session_idx').on(table.collabSessionId),
    index('collab_session_documents_created_at_idx').on(table.createdAt),
  ],
);

export const collabSessionInvitesTable = pgTable(
  'collab_session_invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collabSessionId: uuid('collab_session_id')
      .notNull()
      .references(() => collabSessionsTable.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    inviteTokenHash: text('invite_token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    emailDeliveryStatus: collabInviteDeliveryStatusEnum('email_delivery_status').notNull().default('pending'),
    deliveryError: text('delivery_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('collab_session_invites_token_hash_unq').on(table.inviteTokenHash),
    index('collab_session_invites_session_idx').on(table.collabSessionId),
    index('collab_session_invites_email_idx').on(table.email),
  ],
);

export const collabSessionsRelations = relations(collabSessionsTable, ({ many }) => ({
  participants: many(collabSessionParticipantsTable),
  documents: many(collabSessionDocumentsTable),
  invites: many(collabSessionInvitesTable),
}));
