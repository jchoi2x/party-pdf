import type { RouteHandler } from '@hono/zod-openapi';
import { isAuth0ManagementConfigured } from '../../../services/management-api';
import { sendSessionInvites } from '../../../services/session-invite.service';
import { isSparkPostMailConfigured } from '../../../services/sparkpost-email.service';

import type { SessionInviteConfig } from './session-invite.config';

export const sessionInviteHandler: RouteHandler<SessionInviteConfig, { Bindings: Env }> = async (c) => {
  if (!isAuth0ManagementConfigured(c.env)) {
    return c.json({ error: 'Invites require Auth0 Management API credentials.' }, 503);
  }

  if (!isSparkPostMailConfigured(c.env)) {
    return c.json({ error: 'Outbound email is not configured (SPARKPOST_API_KEY / EMAIL_FROM).' }, 503);
  }

  const jwtPayload = c.get('jwtPayload') as { sub?: string; email?: string } | undefined;
  const ownerId = jwtPayload?.sub;
  if (typeof ownerId !== 'string' || !ownerId.trim()) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const inviterEmailRaw = jwtPayload?.email;
  const inviterEmail =
    typeof inviterEmailRaw === 'string' && inviterEmailRaw.includes('@')
      ? inviterEmailRaw.trim().toLowerCase()
      : undefined;

  const { session_id: sessionId } = c.req.valid('param');
  const { emails: rawEmails } = c.req.valid('json');

  const documentsRepository = c.get('documentsRepository');
  const session = await documentsRepository.getSessionIfOwnedBy(sessionId, ownerId);
  if (!session) {
    return c.json({ error: 'Session not found or you do not have permission to invite participants.' }, 403);
  }

  try {
    const result = await sendSessionInvites({
      env: c.env,
      repository: documentsRepository,
      sessionId,
      rawEmails,
      inviterEmail,
      requestOrigin: c.req.url,
    });
    return c.json(result, 200);
  } catch (err) {
    console.warn('sessionInviteHandler:', err);
    return c.json({ error: 'Failed to complete invitations (Auth0 or email delivery).' }, 502);
  }
};
