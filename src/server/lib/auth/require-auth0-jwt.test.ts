import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireAuth0Jwt, verifyAuth0AccessToken } from './require-auth0-jwt';

const jwtVerifyMock = vi.hoisted(() => vi.fn());
const createRemoteJWKSetMock = vi.hoisted(() => vi.fn(() => ({})));

vi.mock('jose', () => ({
  createRemoteJWKSet: createRemoteJWKSetMock,
  jwtVerify: jwtVerifyMock,
}));

const testBindings = {
  AUTH0_DOMAIN: 'test.auth0.com',
  AUTH0_AUDIENCE: 'https://party-pdf-api',
} satisfies Pick<Env, 'AUTH0_DOMAIN' | 'AUTH0_AUDIENCE'>;

beforeEach(() => {
  vi.clearAllMocks();
  jwtVerifyMock.mockResolvedValue({
    payload: { sub: 'auth0|abc', aud: testBindings.AUTH0_AUDIENCE },
  });
});

describe('verifyAuth0AccessToken', () => {
  it('returns the verified payload', async () => {
    const payload = await verifyAuth0AccessToken(testBindings, 'fake.jwt.token');
    expect(payload.sub).toBe('auth0|abc');
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      'fake.jwt.token',
      {},
      expect.objectContaining({
        issuer: 'https://test.auth0.com/',
        audience: testBindings.AUTH0_AUDIENCE,
      }),
    );
  });

  it('throws when domain or audience is missing', async () => {
    await expect(verifyAuth0AccessToken({ AUTH0_DOMAIN: '', AUTH0_AUDIENCE: 'x' }, 't')).rejects.toThrow(
      /not configured/,
    );
    await expect(verifyAuth0AccessToken({ AUTH0_DOMAIN: 'd', AUTH0_AUDIENCE: '' }, 't')).rejects.toThrow(
      /not configured/,
    );
  });

  it('throws when token is empty', async () => {
    await expect(verifyAuth0AccessToken(testBindings, '')).rejects.toThrow(/Missing access token/);
  });
});

describe('requireAuth0Jwt', () => {
  function appWithAuth() {
    const app = new Hono<{ Bindings: Env }>();
    app.use('*', requireAuth0Jwt);
    app.get('/protected', (c) => c.json({ ok: true, sub: c.get('jwtPayload')?.sub }));
    return app;
  }

  it('returns 500 when Auth0 env is not configured', async () => {
    const app = appWithAuth();
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer x' },
    });
    expect(res.status).toBe(500);
  });

  it('returns 401 when no bearer or access_token', async () => {
    const app = appWithAuth();
    const res = await app.request('/protected', {}, testBindings);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/Missing access token/);
  });

  it('accepts Authorization: Bearer and sets jwtPayload', async () => {
    const app = appWithAuth();
    const res = await app.request('/protected', { headers: { Authorization: 'Bearer any.jwt' } }, testBindings);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; sub?: string };
    expect(body.ok).toBe(true);
    expect(body.sub).toBe('auth0|abc');
  });

  it('accepts access_token query param', async () => {
    const app = appWithAuth();
    const res = await app.request('/protected?access_token=qs.token', {}, testBindings);
    expect(res.status).toBe(200);
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      'qs.token',
      {},
      expect.objectContaining({ audience: testBindings.AUTH0_AUDIENCE }),
    );
  });

  it('returns 401 when jwtVerify rejects', async () => {
    jwtVerifyMock.mockRejectedValueOnce(new Error('bad sig'));
    const app = appWithAuth();
    const res = await app.request('/protected', { headers: { Authorization: 'Bearer bad' } }, testBindings);
    expect(res.status).toBe(401);
  });
});
