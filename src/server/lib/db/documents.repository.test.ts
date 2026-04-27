import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDocumentsRepository } from './documents.repository';
import { getDb } from './index';

vi.mock('./index', () => ({
  getDb: vi.fn(),
}));

const getDbMock = vi.mocked(getDb);

describe('createDocumentsRepository', () => {
  const env = {} as Env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips insert when rows are empty', async () => {
    const values = vi.fn();
    const insert = vi.fn(() => ({ values }));
    getDbMock.mockReturnValue({
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const repo = createDocumentsRepository(env);
    await repo.createMany([]);

    expect(insert).not.toHaveBeenCalled();
    expect(values).not.toHaveBeenCalled();
  });

  it('inserts rows when createMany receives data', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    getDbMock.mockReturnValue({
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const repo = createDocumentsRepository(env);
    await repo.createMany([
      {
        ownerId: 'auth0|1',
        sessionId: 'session-1',
        filename: 'doc.pdf',
        url: 'https://signed-upload-url',
        downloadUrl: 'https://public-download-url',
        bucketPath: 'auth0|1/session-1/file.pdf',
        createdAt: '12345',
        status: 'pending',
      },
    ]);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
  });

  it('creates session and leader participant', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 'session-1' }]);
    const firstValues = vi.fn(() => ({ returning }));
    const secondValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockImplementationOnce(() => ({ values: firstValues })).mockImplementationOnce(() => ({ values: secondValues }));
    getDbMock.mockReturnValue({
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const repo = createDocumentsRepository(env);
    const sessionId = await repo.createSessionWithLeader('auth0|1');

    expect(sessionId).toBe('session-1');
    expect(insert).toHaveBeenCalledTimes(2);
    expect(firstValues).toHaveBeenCalledTimes(1);
    expect(secondValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        userId: 'auth0|1',
        role: 'leader',
      }),
    );
  });

  it('returns paged owner results with computed totals', async () => {
    const countWhere = vi.fn().mockResolvedValue([{ count: 11 }]);
    const countFrom = vi.fn(() => ({ where: countWhere }));

    const dataOffset = vi.fn().mockResolvedValue([
      {
        id: 'doc-1',
        ownerId: 'auth0|1',
        sessionId: 'session-1',
        filename: 'doc.pdf',
        url: 'https://signed-upload-url',
        downloadUrl: 'https://public-download-url',
        bucketPath: 'auth0|1/session-1/file.pdf',
        createdAt: '12345',
        status: 'pending',
      },
    ]);
    const dataLimit = vi.fn(() => ({ offset: dataOffset }));
    const dataOrderBy = vi.fn(() => ({ limit: dataLimit }));
    const dataWhere = vi.fn(() => ({ orderBy: dataOrderBy }));
    const dataFrom = vi.fn(() => ({ where: dataWhere }));

    const select = vi
      .fn()
      .mockImplementationOnce(() => ({ from: countFrom }))
      .mockImplementationOnce(() => ({ from: dataFrom }));

    getDbMock.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);

    const repo = createDocumentsRepository(env);
    const page = await repo.getPageByOwner('auth0|1', 2, 5);

    expect(page.total).toBe(11);
    expect(page.totalPages).toBe(3);
    expect(page.page).toBe(2);
    expect(page.limit).toBe(5);
    expect(page.data).toHaveLength(1);
    expect(dataLimit).toHaveBeenCalledWith(5);
    expect(dataOffset).toHaveBeenCalledWith(5);
  });
});
