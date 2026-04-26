import type { Context } from 'hono';
import { actorFromJwt, collabSessionDocumentsTable, collabSessionParticipantsTable, collabSessionsTable, getDb } from '../../../db';
import { initS3Client } from '../../../utils/s3';

type Ctx = Context<
  { Bindings: Env },
  '/docs/upload-url',
  {
    in: { query: { filenames: string[]; contentType: string } };
    out: { query: { filenames: string[]; contentType: string } };
  }
>;

export const uploadUrlHandler = async (c: Ctx) => {
  const { filenames, contentType } = c.req.valid('query');
  const jwtPayload = c.get('jwtPayload');
  const actor = actorFromJwt(jwtPayload);
  if (!actor.userSub) {
    return c.json({ error: 'unauthorized', message: 'Invalid JWT subject.' }, 401);
  }

  const sessionId = crypto.randomUUID();
  const ownerEmail = actor.email ?? `${actor.userSub.toLowerCase()}@local.invalid`;
  const { generateUploadUrl } = initS3Client();
  const data = await Promise.all(
    filenames.map((filename) =>
      generateUploadUrl({
        prefix: `sessions/${sessionId}`,
        contentType,
        name: filename,
      }),
    ),
  );

  const db = getDb(c.env);
  await db.transaction(async (tx) => {
    await tx.insert(collabSessionsTable).values({
      id: sessionId,
      ownerUserSub: actor.userSub,
    });
    await tx.insert(collabSessionParticipantsTable).values({
      collabSessionId: sessionId,
      userSub: actor.userSub,
      email: ownerEmail,
      role: 'owner',
      inviteStatus: 'accepted',
      invitedAt: new Date(),
      acceptedAt: new Date(),
    });
    await tx.insert(collabSessionDocumentsTable).values(
      data.map((doc) => ({
        id: doc.id,
        collabSessionId: sessionId,
        filename: doc.filename,
        bucketPath: doc.bucketPath,
        uploadUrl: doc.url,
        downloadUrl: doc.downloadUrl,
        status: 'pending' as const,
      })),
    );
  });

  return c.json({ data, collab_session_id: sessionId }, 200);
};
