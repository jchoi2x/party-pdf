import type { RouteHandler } from '@hono/zod-openapi';
import { createVideoToken } from '../../../services/video-token.service';

import type { GetTokenConfig } from './get-token.config';

export const getTokenHandler: RouteHandler<GetTokenConfig, { Bindings: Env }> = async (c) => {
  const { roomName, participantName } = c.req.valid('json');

  try {
    const result = await createVideoToken(c.env, { roomName, participantName });
    return c.json(result, 200);
  } catch (err) {
    console.warn('getTokenHandler:', err);
    return c.json({ error: 'token_generation_failed', message: 'Failed to generate video token.' }, 400);
  }
};
