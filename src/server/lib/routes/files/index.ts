import { OpenAPIHono } from '@hono/zod-openapi';
import { count, desc, eq, or } from 'drizzle-orm';
import { actorFromJwt, collabSessionDocumentsTable, collabSessionParticipantsTable, getDb } from '../../db';
import { uploadUrlRouter } from './upload-url/upload-url.route';

export const filesRouter = new OpenAPIHono<{ Bindings: Env }>();

filesRouter.get('/docs', async (c) => {
  const jwtPayload = c.get('jwtPayload');
  const actor = actorFromJwt(jwtPayload);
  if (!actor.userSub) {
    return c.json({ error: 'unauthorized', message: 'Invalid JWT subject.' }, 401);
  }

  const { limit: limitRaw = '10', page: pageRaw = '1' } = c.req.query();
  const limit = Math.max(1, Number.parseInt(limitRaw, 10) || 10);
  const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
  const offset = (page - 1) * limit;

  const identityChecks = [eq(collabSessionParticipantsTable.userSub, actor.userSub)];
  if (actor.email) {
    identityChecks.push(eq(collabSessionParticipantsTable.email, actor.email));
  }
  const visibleSessionFilter = or(...identityChecks);

  const db = getDb(c.env);
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: collabSessionDocumentsTable.id,
        collab_session_id: collabSessionDocumentsTable.collabSessionId,
        filename: collabSessionDocumentsTable.filename,
        url: collabSessionDocumentsTable.uploadUrl,
        download_url: collabSessionDocumentsTable.downloadUrl,
        bucket_path: collabSessionDocumentsTable.bucketPath,
        created_at: collabSessionDocumentsTable.createdAt,
        status: collabSessionDocumentsTable.status,
      })
      .from(collabSessionDocumentsTable)
      .innerJoin(
        collabSessionParticipantsTable,
        eq(collabSessionParticipantsTable.collabSessionId, collabSessionDocumentsTable.collabSessionId),
      )
      .where(visibleSessionFilter)
      .orderBy(desc(collabSessionDocumentsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(collabSessionDocumentsTable)
      .innerJoin(
        collabSessionParticipantsTable,
        eq(collabSessionParticipantsTable.collabSessionId, collabSessionDocumentsTable.collabSessionId),
      )
      .where(visibleSessionFilter),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  const totalPages = Math.ceil(total / limit) || 1;
  return c.json(
    {
      data: rows.map((row) => ({
        ...row,
        created_at: row.created_at.toISOString(),
      })),
      total,
      totalPages,
      page,
      limit,
    },
    200,
  );
});

filesRouter.route('', uploadUrlRouter);

export * from './upload-url';
