import type { JWTPayload } from 'jose';
import { and, eq, or } from 'drizzle-orm';
import { collabSessionParticipantsTable } from './schema';
import { getDb } from './client';

export type SessionActor = {
  userSub: string;
  email: string | null;
};

export function actorFromJwt(jwtPayload: JWTPayload): SessionActor {
  const userSub = typeof jwtPayload.sub === 'string' ? jwtPayload.sub : '';
  const email = typeof jwtPayload.email === 'string' ? jwtPayload.email.trim().toLowerCase() : null;
  return {
    userSub,
    email: email && email.length > 0 ? email : null,
  };
}

export async function isSessionParticipant(
  env: Pick<Env, 'HYPERDRIVE'>,
  sessionId: string,
  actor: SessionActor,
): Promise<boolean> {
  if (!actor.userSub) {
    return false;
  }
  const db = getDb(env);
  const identityChecks = [eq(collabSessionParticipantsTable.userSub, actor.userSub)];
  if (actor.email) {
    identityChecks.push(eq(collabSessionParticipantsTable.email, actor.email));
  }
  const participant = await db.query.collabSessionParticipantsTable.findFirst({
    where: and(eq(collabSessionParticipantsTable.collabSessionId, sessionId), or(...identityChecks)),
    columns: { id: true },
  });
  return Boolean(participant);
}
