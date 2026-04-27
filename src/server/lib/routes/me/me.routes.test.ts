import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const isAuth0ManagementConfiguredMock = vi.hoisted(() => vi.fn());
const patchAuth0UserNamesMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/management-api', () => ({
  isAuth0ManagementConfigured: isAuth0ManagementConfiguredMock,
  patchAuth0UserNames: patchAuth0UserNamesMock,
}));

describe('meRouter endpoints', () => {
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
    return import('./index').then(({ meRouter }) => {
      app.route('', meRouter);
      return app;
    });
  }

  it('returns jwt payload from get-me endpoint', async () => {
    const res = await (await app({ sub: 'auth0|abc', email: 'a@b.com' })).request('/me');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sub: 'auth0|abc', email: 'a@b.com' });
  });

  it('returns 400 from patch-profile endpoint for invalid body', async () => {
    const res = await (await app({ sub: 'auth0|abc' })).request('/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
