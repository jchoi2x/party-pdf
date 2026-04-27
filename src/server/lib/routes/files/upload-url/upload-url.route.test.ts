import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadUrlRouter } from './upload-url.route';

const createUploadUrlsMock = vi.hoisted(() => vi.fn());

vi.mock('../../../services/upload-url.service', () => ({
  createUploadUrls: createUploadUrlsMock,
}));

describe('uploadUrlRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUploadUrlsMock.mockResolvedValue({
      data: [{ id: 'doc-1', filename: 'a.pdf', url: 'https://upload', bucketPath: 'owner/doc-1.pdf' }],
    });
  });

  function app(jwtPayload?: Record<string, unknown>) {
    const app = new Hono<{ Bindings: Env }>();
    app.use('*', async (c, next) => {
      if (jwtPayload) {
        c.set('jwtPayload', jwtPayload);
      }
      c.set('documentsRepository', { createMany: vi.fn().mockResolvedValue(undefined) });
      await next();
    });
    app.route('', uploadUrlRouter);
    return app;
  }

  it('returns upload URLs on valid request', async () => {
    const res = await app({ sub: 'auth0|abc' }).request('/docs/upload-url?filenames=a.pdf&contentType=application/pdf');
    expect(res.status).toBe(200);
  });

  it('returns 401 without owner id', async () => {
    const res = await app().request('/docs/upload-url?filenames=a.pdf&contentType=application/pdf');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid query', async () => {
    const res = await app({ sub: 'auth0|abc' }).request('/docs/upload-url?contentType=application/pdf');
    expect(res.status).toBe(400);
  });

  it('returns 500 when upload service fails', async () => {
    createUploadUrlsMock.mockRejectedValueOnce(new Error('upload failure'));
    const res = await app({ sub: 'auth0|abc' }).request('/docs/upload-url?filenames=a.pdf&contentType=application/pdf');
    expect(res.status).toBe(500);
  });
});
