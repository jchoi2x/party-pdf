import { beforeEach, describe, expect, it, vi } from 'vitest';

const documentsRepositoryMiddlewareMock = vi.hoisted(() =>
  vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
);

vi.mock('../../middleware/repositories', () => ({
  documentsRepositoryMiddleware: documentsRepositoryMiddlewareMock,
}));

describe('sessionsRouter wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies group middleware and mounts child routes', async () => {
    const { sessionsRouter } = await import('./index');
    const res = await sessionsRouter.request('/sessions', { method: 'POST' });
    expect(documentsRepositoryMiddlewareMock).toHaveBeenCalled();
    expect(res.status).not.toBe(404);
  });
});
