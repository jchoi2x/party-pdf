import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuth0JwtMock = vi.hoisted(() =>
  vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
);
const documentsRepositoryMiddlewareMock = vi.hoisted(() =>
  vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
);

vi.mock('../middleware/auth', () => ({
  requireAuth0Jwt: requireAuth0JwtMock,
}));
vi.mock('../middleware/repositories', () => ({
  documentsRepositoryMiddleware: documentsRepositoryMiddlewareMock,
}));

describe('apiApp wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies auth middleware globally', async () => {
    const { apiApp } = await import('./index');
    await apiApp.request('/ping');
    expect(requireAuth0JwtMock).toHaveBeenCalled();
  });

  it('serves health endpoint contract', async () => {
    const { apiApp } = await import('./index');
    const healthRes = await apiApp.request('/ping');
    expect(healthRes.status).toBe(200);
    expect(await healthRes.json()).toEqual({ message: 'pong' });
  });

  it('serves videos endpoint validation contract', async () => {
    const { apiApp } = await import('./index');
    const videoRes = await apiApp.request('/videos/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(videoRes.status).toBe(400);
  });
});
