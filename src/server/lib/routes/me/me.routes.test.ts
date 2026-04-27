import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMeRouter } from './get-me/get-me.route';
import { patchProfileRouter } from './patch-profile/patch-profile.route';

const isAuth0ManagementConfiguredMock = vi.hoisted(() => vi.fn());
const patchAuth0UserNamesMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/management-api', () => ({
  isAuth0ManagementConfigured: isAuth0ManagementConfiguredMock,
  patchAuth0UserNames: patchAuth0UserNamesMock,
}));

describe('me routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuth0ManagementConfiguredMock.mockReturnValue(true);
    patchAuth0UserNamesMock.mockResolvedValue(undefined);
  });

  function app(jwtPayload?: Record<string, unknown>) {
    const app = new Hono<{ Bindings: Env }>();
    if (jwtPayload) {
      app.use('*', async (c, next) => {
        c.set('jwtPayload', jwtPayload);
        await next();
      });
    }
    app.route('', getMeRouter);
    app.route('', patchProfileRouter);
    return app;
  }

  it('get /me returns jwt payload', async () => {
    const res = await app({ sub: 'auth0|abc', email: 'a@b.com' }).request('/me');
    expect(res.status).toBe(200);
  });

  it('patch /me/profile returns 503 when auth0 management is not configured', async () => {
    isAuth0ManagementConfiguredMock.mockReturnValueOnce(false);
    const res = await app({ sub: 'auth0|abc' }).request('/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ givenName: 'Ada', familyName: 'Lovelace' }),
    });
    expect(res.status).toBe(503);
  });

  it('patch /me/profile returns 400 for invalid body', async () => {
    const res = await app({ sub: 'auth0|abc' }).request('/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ givenName: '', familyName: 'Lovelace' }),
    });
    expect(res.status).toBe(400);
  });

  it('patch /me/profile returns 502 when service fails', async () => {
    patchAuth0UserNamesMock.mockRejectedValueOnce(new Error('auth0 failed'));
    const res = await app({ sub: 'auth0|abc' }).request('/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ givenName: 'Ada', familyName: 'Lovelace' }),
    });
    expect(res.status).toBe(502);
  });
});
