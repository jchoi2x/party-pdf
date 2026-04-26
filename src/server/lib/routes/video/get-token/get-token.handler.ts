import type { RouteHandler } from '@hono/zod-openapi';
import { AccessToken } from 'livekit-server-sdk';
import { actorFromJwt, isSessionParticipant } from '../../../db';

import type { GetTokenConfig } from './get-token.config';

export const getTokenHandler: RouteHandler<GetTokenConfig, { Bindings: Env }> = async (c) => {
  const { roomName, participantName } = c.req.valid('json');
  const actor = actorFromJwt(c.get('jwtPayload'));
  const hasAccess = await isSessionParticipant(c.env, roomName, actor);
  if (!hasAccess) {
    return c.json({ error: 'forbidden', message: 'You are not a participant in this session.' }, 403);
  }

  const at = new AccessToken(c.env.LIVEKIT_API_KEY, c.env.LIVEKIT_API_SECRET, {
    identity: participantName,
  });

  at.addGrant({ roomJoin: true, room: roomName });
  const token = await at.toJwt();
  return c.json({ token, roomName, url: c.env.LIVEKIT_URL! }, 200);
};
