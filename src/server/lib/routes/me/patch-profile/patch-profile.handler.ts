import type { RouteHandler } from '@hono/zod-openapi';

import { isAuth0ManagementConfigured, patchAuth0UserNames } from '../../../services/management-api';

import type { PatchProfileConfig } from './patch-profile.config';

export const patchProfileHandler: RouteHandler<PatchProfileConfig, { Bindings: Env }> = async (c) => {
  if (!isAuth0ManagementConfigured(c.env)) {
    return c.json({ error: 'Profile update is not configured (Auth0 Management API credentials).' }, 503);
  }

  const jwt = c.get('jwtPayload');
  const sub = jwt.sub;
  if (typeof sub !== 'string' || !sub.trim()) {
    return c.json({ error: 'Token is missing a user subject (sub).' }, 400);
  }

  const { givenName, familyName } = c.req.valid('json');

  try {
    await patchAuth0UserNames(c.env, sub.trim(), givenName, familyName);
    return c.json({ ok: true as const, givenName: givenName.trim(), familyName: familyName.trim() }, 200);
  } catch (err) {
    console.warn('patchProfileHandler:', err);
    return c.json({ error: 'Failed to update profile in Auth0.' }, 502);
  }
};
