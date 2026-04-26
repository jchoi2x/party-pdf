import { OpenAPIHono } from '@hono/zod-openapi';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import {
  actorFromJwt,
  collabSessionDocumentsTable,
  collabSessionInvitesTable,
  collabSessionParticipantsTable,
  collabSessionsTable,
  getDb,
} from '../../db';
import { findAuth0UserByEmail, isAuth0ManagementConfigured } from '../../utils/management-api';

export const collabSessionsRouter = new OpenAPIHono<{ Bindings: Env }>();

type InviteAudienceStatus = 'existing_user' | 'needs_registration' | 'failure';

type InviteDeliveryResult = {
  emailDeliveryStatus: 'pending' | 'sent' | 'failed';
  error: string | null;
};

interface InviteDeliveryGateway {
  deliverInvite(args: { sessionId: string; email: string }): Promise<InviteDeliveryResult>;
}

class NoopInviteDeliveryGateway implements InviteDeliveryGateway {
  async deliverInvite(_args: { sessionId: string; email: string }): Promise<InviteDeliveryResult> {
    return { emailDeliveryStatus: 'pending', error: null };
  }
}

const inviteDeliveryGateway: InviteDeliveryGateway = new NoopInviteDeliveryGateway();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashInviteToken(token: string): Promise<string> {
  const input = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

collabSessionsRouter.get('/collab-sessions/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const actor = actorFromJwt(c.get('jwtPayload'));
  if (!actor.userSub) {
    return c.json({ error: 'unauthorized', message: 'Invalid JWT subject.' }, 401);
  }

  const identityChecks = [eq(collabSessionParticipantsTable.userSub, actor.userSub)];
  if (actor.email) {
    identityChecks.push(eq(collabSessionParticipantsTable.email, actor.email));
  }

  const db = getDb(c.env);
  const sessionWithMembership = await db
    .select({
      id: collabSessionsTable.id,
      ownerUserSub: collabSessionsTable.ownerUserSub,
      status: collabSessionsTable.status,
      title: collabSessionsTable.title,
      createdAt: collabSessionsTable.createdAt,
      updatedAt: collabSessionsTable.updatedAt,
    })
    .from(collabSessionsTable)
    .innerJoin(
      collabSessionParticipantsTable,
      eq(collabSessionParticipantsTable.collabSessionId, collabSessionsTable.id),
    )
    .where(and(eq(collabSessionsTable.id, sessionId), or(...identityChecks)))
    .limit(1);

  const session = sessionWithMembership[0];
  if (!session) {
    return c.json({ error: 'forbidden', message: 'You are not a participant in this session.' }, 403);
  }

  const [participants, documents] = await Promise.all([
    db.query.collabSessionParticipantsTable.findMany({
      where: eq(collabSessionParticipantsTable.collabSessionId, sessionId),
      orderBy: [asc(collabSessionParticipantsTable.createdAt)],
    }),
    db.query.collabSessionDocumentsTable.findMany({
      where: eq(collabSessionDocumentsTable.collabSessionId, sessionId),
      orderBy: [asc(collabSessionDocumentsTable.createdAt)],
    }),
  ]);

  return c.json(
    {
      data: {
        id: session.id,
        owner_user_sub: session.ownerUserSub,
        status: session.status,
        title: session.title,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        participants: participants.map((participant) => ({
          id: participant.id,
          collab_session_id: participant.collabSessionId,
          email: participant.email,
          user_sub: participant.userSub,
          role: participant.role,
          invite_status: participant.inviteStatus,
          invited_at: participant.invitedAt?.toISOString() ?? null,
          accepted_at: participant.acceptedAt?.toISOString() ?? null,
          created_at: participant.createdAt.toISOString(),
        })),
        documents: documents.map((doc) => ({
          id: doc.id,
          collab_session_id: doc.collabSessionId,
          filename: doc.filename,
          bucket_path: doc.bucketPath,
          upload_url: doc.uploadUrl,
          download_url: doc.downloadUrl,
          status: doc.status,
          created_at: doc.createdAt.toISOString(),
        })),
      },
    },
    200,
  );
});

collabSessionsRouter.get('/collab-sessions/:sessionId/documents', async (c) => {
  const sessionId = c.req.param('sessionId');
  const actor = actorFromJwt(c.get('jwtPayload'));
  if (!actor.userSub) {
    return c.json({ error: 'unauthorized', message: 'Invalid JWT subject.' }, 401);
  }

  const identityChecks = [eq(collabSessionParticipantsTable.userSub, actor.userSub)];
  if (actor.email) {
    identityChecks.push(eq(collabSessionParticipantsTable.email, actor.email));
  }

  const db = getDb(c.env);
  const membership = await db.query.collabSessionParticipantsTable.findFirst({
    where: and(eq(collabSessionParticipantsTable.collabSessionId, sessionId), or(...identityChecks)),
    columns: { id: true },
  });
  if (!membership) {
    return c.json({ error: 'forbidden', message: 'You are not a participant in this session.' }, 403);
  }

  const documents = await db.query.collabSessionDocumentsTable.findMany({
    where: eq(collabSessionDocumentsTable.collabSessionId, sessionId),
    orderBy: [desc(collabSessionDocumentsTable.createdAt)],
  });

  return c.json(
    {
      data: documents.map((doc) => ({
        id: doc.id,
        collab_session_id: doc.collabSessionId,
        filename: doc.filename,
        url: doc.uploadUrl,
        download_url: doc.downloadUrl,
        bucket_path: doc.bucketPath,
        created_at: doc.createdAt.toISOString(),
        status: doc.status,
      })),
    },
    200,
  );
});

collabSessionsRouter.post('/collab-sessions/:sessionId/invites', async (c) => {
  const sessionId = c.req.param('sessionId');
  const actor = actorFromJwt(c.get('jwtPayload'));
  if (!actor.userSub) {
    return c.json({ error: 'unauthorized', message: 'Invalid JWT subject.' }, 401);
  }

  const payload = (await c.req.json().catch(() => null)) as { emails?: unknown } | null;
  const rawEmails: unknown[] = Array.isArray(payload?.emails) ? payload.emails : [];
  const normalizedEmails: string[] = [
    ...new Set(
      rawEmails
        .filter((e): e is string => typeof e === 'string')
        .map(normalizeEmail)
        .filter((e) => e.length > 0),
    ),
  ];

  if (normalizedEmails.length === 0) {
    return c.json({ error: 'bad_request', message: 'At least one invite email is required.' }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmail = normalizedEmails.find((email) => !emailRegex.test(email));
  if (invalidEmail) {
    return c.json({ error: 'bad_request', message: `Invalid email: ${invalidEmail}` }, 400);
  }

  const db = getDb(c.env);
  const ownerIdentityChecks = [eq(collabSessionParticipantsTable.userSub, actor.userSub)];
  if (actor.email) {
    ownerIdentityChecks.push(eq(collabSessionParticipantsTable.email, actor.email));
  }
  const ownerMembership = await db.query.collabSessionParticipantsTable.findFirst({
    where: and(
      eq(collabSessionParticipantsTable.collabSessionId, sessionId),
      eq(collabSessionParticipantsTable.role, 'owner'),
      or(...ownerIdentityChecks),
    ),
    columns: { id: true },
  });
  if (!ownerMembership) {
    return c.json({ error: 'forbidden', message: 'Only session owners can send invites.' }, 403);
  }

  const existingParticipants = await db.query.collabSessionParticipantsTable.findMany({
    where: and(
      eq(collabSessionParticipantsTable.collabSessionId, sessionId),
      inArray(collabSessionParticipantsTable.email, normalizedEmails),
    ),
  });
  const participantByEmail = new Map(existingParticipants.map((participant) => [normalizeEmail(participant.email), participant]));
  const auth0Configured = isAuth0ManagementConfigured(c.env);

  const results: Array<{
    email: string;
    status: InviteAudienceStatus;
    reason: string | null;
    user_sub: string | null;
    collab_session_id: string;
    invite_status: 'pending' | 'sent' | 'failed' | 'accepted';
  }> = [];

  for (const email of normalizedEmails) {
    const existingParticipant = participantByEmail.get(email);
    if (existingParticipant?.role === 'owner') {
      results.push({
        email,
        status: 'existing_user',
        reason: 'owner_already_participant',
        user_sub: existingParticipant.userSub,
        collab_session_id: sessionId,
        invite_status: 'accepted',
      });
      continue;
    }

    let status: InviteAudienceStatus = 'needs_registration';
    let reason: string | null = null;
    let resolvedUserSub: string | null = existingParticipant?.userSub ?? null;
    let participantInviteStatus: 'pending' | 'sent' | 'failed' = 'pending';
    let deliveryStatus: 'pending' | 'sent' | 'failed' = 'pending';
    let deliveryError: string | null = null;

    if (!auth0Configured) {
      status = 'failure';
      reason = 'auth0_management_not_configured';
      participantInviteStatus = 'failed';
      deliveryStatus = 'failed';
      deliveryError = reason;
    } else {
      try {
        const auth0User = await findAuth0UserByEmail(c.env, email);
        if (auth0User) {
          status = 'existing_user';
          resolvedUserSub = auth0User.userId;
        } else {
          status = 'needs_registration';
        }
      } catch (error) {
        status = 'failure';
        reason = error instanceof Error ? error.message.slice(0, 200) : 'auth0_lookup_failed';
        participantInviteStatus = 'failed';
        deliveryStatus = 'failed';
        deliveryError = reason;
      }
    }

    if (status !== 'failure') {
      const delivery = await inviteDeliveryGateway.deliverInvite({ sessionId, email });
      deliveryStatus = delivery.emailDeliveryStatus;
      deliveryError = delivery.error;
      participantInviteStatus = deliveryStatus === 'failed' ? 'failed' : deliveryStatus;
      if (deliveryStatus === 'failed' && !reason) {
        reason = deliveryError ?? 'invite_delivery_failed';
      }
    }

    const now = new Date();
    const rawToken = crypto.randomUUID();
    const inviteTokenHash = await hashInviteToken(rawToken);
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

    await db.transaction(async (tx) => {
      await tx
        .insert(collabSessionParticipantsTable)
        .values({
          collabSessionId: sessionId,
          email,
          userSub: resolvedUserSub,
          role: 'participant',
          inviteStatus: participantInviteStatus,
          invitedAt: now,
        })
        .onConflictDoUpdate({
          target: [collabSessionParticipantsTable.collabSessionId, collabSessionParticipantsTable.email],
          set: {
            userSub: resolvedUserSub,
            role: 'participant',
            inviteStatus: participantInviteStatus,
            invitedAt: now,
          },
        });

      await tx.insert(collabSessionInvitesTable).values({
        collabSessionId: sessionId,
        email,
        inviteTokenHash,
        expiresAt,
        emailDeliveryStatus: deliveryStatus,
        deliveryError,
      });
    });

    results.push({
      email,
      status,
      reason,
      user_sub: resolvedUserSub,
      collab_session_id: sessionId,
      invite_status: participantInviteStatus,
    });
  }

  return c.json(
    {
      collab_session_id: sessionId,
      results,
    },
    200,
  );
});
