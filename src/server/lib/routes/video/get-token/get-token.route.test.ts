import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTokenRouter } from './get-token.route';

const createVideoTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../../../services/video-token.service', () => ({
  createVideoToken: createVideoTokenMock,
}));

describe('getTokenRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createVideoTokenMock.mockResolvedValue({
      token: 'token',
      roomName: 'room',
      url: 'https://livekit.example.com',
    });
  });

  function app() {
    const app = new Hono<{ Bindings: Env }>();
    app.route('', getTokenRouter);
    return app;
  }

  it('returns token on valid request', async () => {
    const res = await app().request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'room', participantName: 'alex' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBe('token');
  });

  it('returns 400 for invalid payload', async () => {
    const res = await app().request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'room' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when token service fails', async () => {
    createVideoTokenMock.mockRejectedValueOnce(new Error('boom'));
    const res = await app().request('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: 'room', participantName: 'alex' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('token_generation_failed');
  });
});
