import { beforeEach, describe, expect, it, vi } from 'vitest';

const createVideoTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/video-token.service', () => ({
  createVideoToken: createVideoTokenMock,
}));

describe('videosRouter endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createVideoTokenMock.mockResolvedValue({
      token: 'token',
      roomName: 'room',
      url: 'https://livekit.example.com',
    });
  });

  it('returns token payload for valid request', async () => {
    const { videosRouter } = await import('./index');
    const res = await videosRouter.request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'room', participantName: 'alex' }),
    });
    const body = (await res.json()) as { token: string };

    expect(res.status).toBe(200);
    expect(body.token).toBe('token');
  });

  it('returns 400 for invalid token payload', async () => {
    const { videosRouter } = await import('./index');
    const res = await videosRouter.request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'room' }),
    });
    expect(res.status).toBe(400);
  });
});
