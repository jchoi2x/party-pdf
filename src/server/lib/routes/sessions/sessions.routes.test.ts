import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attachDocumentsRouter } from './attach-documents';
import { createSessionRouter } from './create-session';
import { getDocumentsRouter } from './get-documents';
import { getSessionsRouter } from './get-sessions';
import { sessionInviteRouter } from './session-invite';

const sendSessionInvitesMock = vi.hoisted(() => vi.fn());
const isSparkPostMailConfiguredMock = vi.hoisted(() => vi.fn());
const isAuth0ManagementConfiguredMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/session-invite.service', () => ({
  sendSessionInvites: sendSessionInvitesMock,
}));

vi.mock('../../services/sparkpost-email.service', () => ({
  isSparkPostMailConfigured: isSparkPostMailConfiguredMock,
}));

vi.mock('../../services/management-api', async () => {
  const mod = await vi.importActual<typeof import('../../services/management-api')>('../../services/management-api');
  return {
    ...mod,
    isAuth0ManagementConfigured: isAuth0ManagementConfiguredMock,
  };
});

describe('session endpoint routers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSparkPostMailConfiguredMock.mockReturnValue(true);
    isAuth0ManagementConfiguredMock.mockReturnValue(true);
    sendSessionInvitesMock.mockResolvedValue({
      sent: [{ email: 'friend@example.com', kind: 'existing_user' }],
      skipped: [],
    });
  });

  function repo() {
    return {
      createSessionWithLeader: vi.fn().mockResolvedValue('session-1'),
      getSessionsWithDetailsPageByOwner: vi.fn().mockResolvedValue({ data: [], total: 0, totalPages: 0 }),
      getByOwnerAndSession: vi.fn().mockResolvedValue([]),
      getSessionIfOwnedBy: vi.fn().mockResolvedValue({ id: 'session-1', ownerId: 'auth0|abc' }),
      attachDocumentsToSession: vi.fn().mockResolvedValue({ attachedCount: 1, attachedIds: ['doc-1'] }),
      addParticipantMember: vi.fn().mockResolvedValue(undefined),
    };
  }

  function buildApp(jwtPayload?: Record<string, unknown>) {
    const app = new Hono<{ Bindings: Env }>();
    const documentsRepository = repo();
    app.use('*', async (c, next) => {
      if (jwtPayload) {
        c.set('jwtPayload', jwtPayload);
      }
      c.set('documentsRepository', documentsRepository);
      await next();
    });
    app.route('', createSessionRouter);
    app.route('', getSessionsRouter);
    app.route('', getDocumentsRouter);
    app.route('', attachDocumentsRouter);
    app.route('', sessionInviteRouter);
    return { app, documentsRepository };
  }

  it('creates a session', async () => {
    const { app } = buildApp({ sub: 'auth0|abc' });
    const res = await app.request('/sessions', { method: 'POST' });
    expect(res.status).toBe(200);
  });

  it('returns 401 when creating session without auth', async () => {
    const { app } = buildApp();
    const res = await app.request('/sessions', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('lists sessions with valid query', async () => {
    const { app } = buildApp({ sub: 'auth0|abc' });
    const res = await app.request('/sessions?limit=10&page=1');
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid sessions query', async () => {
    const { app } = buildApp({ sub: 'auth0|abc' });
    const res = await app.request('/sessions?limit=0&page=1');
    expect(res.status).toBe(400);
  });

  it('returns documents for session', async () => {
    const { app } = buildApp({ sub: 'auth0|abc' });
    const res = await app.request('/sessions/session-1/documents');
    expect(res.status).toBe(200);
  });

  it('attaches documents with valid body', async () => {
    const { app } = buildApp({ sub: 'auth0|abc' });
    const res = await app.request('/sessions/session-1/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds: ['doc-1'] }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid attach-documents body', async () => {
    const { app } = buildApp({ sub: 'auth0|abc' });
    const res = await app.request('/sessions/session-1/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('invites participants with valid request', async () => {
    const { app } = buildApp({ sub: 'auth0|abc', email: 'owner@example.com' });
    const res = await app.request('/sessions/session-1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: ['friend@example.com'] }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 503 when invite dependencies are not configured', async () => {
    isSparkPostMailConfiguredMock.mockReturnValueOnce(false);
    const { app } = buildApp({ sub: 'auth0|abc', email: 'owner@example.com' });
    const res = await app.request('/sessions/session-1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: ['friend@example.com'] }),
    });
    expect(res.status).toBe(503);
  });

  it('returns 502 when invite service fails', async () => {
    sendSessionInvitesMock.mockRejectedValueOnce(new Error('invite fail'));
    const { app } = buildApp({ sub: 'auth0|abc', email: 'owner@example.com' });
    const res = await app.request('/sessions/session-1/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: ['friend@example.com'] }),
    });
    expect(res.status).toBe(502);
  });
});
