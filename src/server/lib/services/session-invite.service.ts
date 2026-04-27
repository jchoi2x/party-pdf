import { normalizeInviteEmails } from '../utils/invite-emails';
import { createAuth0DatabaseUser, createAuth0PasswordChangeTicket, findAuth0UserByEmail } from './management-api';
import {
  sendSessionInviteExistingUserEmail,
  sendSessionInviteFinishRegistrationEmail,
} from './session-invite-email.service';

interface SessionInviteDocumentsRepository {
  addParticipantMember(sessionId: string, userId: string): Promise<unknown>;
}

export interface SessionInviteInput {
  env: Env;
  repository: SessionInviteDocumentsRepository;
  sessionId: string;
  rawEmails: string[];
  inviterEmail?: string;
  requestOrigin: string;
}

export interface SessionInviteResult {
  sent: Array<{ email: string; kind: 'existing_user' | 'pending_registration' }>;
  skipped: Array<{ email: string; reason: 'invalid_email' | 'self_invite' }>;
}

function resolvePublicBaseUrl(env: Env, requestUrl: string): string {
  const configured = env.APP_PUBLIC_URL?.trim();
  if (configured && configured.length > 0) {
    return configured.replace(/\/+$/, '');
  }
  return new URL(requestUrl).origin;
}

export async function sendSessionInvites(input: SessionInviteInput): Promise<SessionInviteResult> {
  const uniqNormalized = normalizeInviteEmails(input.rawEmails);
  const normSet = new Set(uniqNormalized);

  const skipped: Array<{ email: string; reason: 'invalid_email' | 'self_invite' }> = [];
  const invalidSeen = new Set<string>();

  for (const line of input.rawEmails) {
    for (const part of line.split(/[\s,;]+/)) {
      const token = part.trim();
      if (token.length === 0) {
        continue;
      }
      const lower = token.toLowerCase();
      if (normSet.has(lower)) {
        continue;
      }
      if (invalidSeen.has(lower)) {
        continue;
      }
      invalidSeen.add(lower);
      skipped.push({ email: token, reason: 'invalid_email' });
    }
  }

  const toInvite: string[] = [];
  for (const email of uniqNormalized) {
    if (input.inviterEmail && email === input.inviterEmail) {
      skipped.push({ email, reason: 'self_invite' });
      continue;
    }
    toInvite.push(email);
  }

  const publicBase = resolvePublicBaseUrl(input.env, input.requestOrigin).replace(/\/+$/, '');
  const documentUrl = `${publicBase}/document/${encodeURIComponent(input.sessionId)}`;
  const sent: Array<{ email: string; kind: 'existing_user' | 'pending_registration' }> = [];

  for (const email of toInvite) {
    const auth0User = await findAuth0UserByEmail(input.env, email);

    if (auth0User) {
      await input.repository.addParticipantMember(input.sessionId, auth0User.userId);
      await sendSessionInviteExistingUserEmail(input.env, { to: email, documentUrl });
      sent.push({ email, kind: 'existing_user' });
      continue;
    }

    const { userId } = await createAuth0DatabaseUser(input.env, email);
    await input.repository.addParticipantMember(input.sessionId, userId);
    const finishUrl = await createAuth0PasswordChangeTicket(input.env, userId, documentUrl);
    await sendSessionInviteFinishRegistrationEmail(input.env, {
      to: email,
      finishRegistrationUrl: finishUrl,
      sessionDocumentUrl: documentUrl,
    });
    sent.push({ email, kind: 'pending_registration' });
  }

  return { sent, skipped };
}
