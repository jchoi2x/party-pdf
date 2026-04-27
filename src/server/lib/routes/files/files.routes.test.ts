import { beforeEach, describe, expect, it, vi } from 'vitest';

const documentsRepositoryMiddlewareMock = vi.hoisted(() =>
  vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
);

vi.mock('../../middleware/repositories', () => ({
  documentsRepositoryMiddleware: documentsRepositoryMiddlewareMock,
}));

describe('filesRouter wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for upload-url endpoint when jwt is missing', async () => {
    const { filesRouter } = await import('./index');
    const res = await filesRouter.request('/docs/upload-url?filenames=a.pdf&contentType=application/pdf');
    const body = (await res.json()) as { error?: string };

    expect(documentsRepositoryMiddlewareMock).toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });
});
