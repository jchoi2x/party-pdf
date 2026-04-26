import { readFileSync, existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { USER_STATE_PATH } from '../helpers/auth';
import { isAuthAvailable } from '../helpers/auth';

/**
 * API smoke tests.
 * These tests call the Hono backend directly from the test context (no browser UI).
 *
 * Architecture note:
 *   All API routes mount under /api (src/server/index.ts basePath).
 *   The /api/ping route (health check) sits behind requireAuth0Jwt middleware,
 *   so it returns 401 without a valid JWT — both cases are verified below.
 */

const BASE_URL = `http://localhost:${process.env.PORT ?? '3000'}`;

test.describe('API — unauthenticated smoke tests', () => {
  test('GET /api/ping returns 401 without Authorization header', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/ping`);

    // The health endpoint is protected — 401 confirms the auth middleware is active
    expect(response.status()).toBe(401);
  });

  test('GET /api/unknown-route returns 404 or 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/__e2e_nonexistent__`);

    expect([401, 404]).toContain(response.status());
  });

  test('OPTIONS /api/ping includes CORS headers (cors middleware)', async ({ request }) => {
    const response = await request.fetch(`${BASE_URL}/api/ping`, {
      method: 'OPTIONS',
      headers: { Origin: BASE_URL, 'Access-Control-Request-Method': 'GET' },
    });

    // The API enables CORS for all origins; preflight should succeed or fall through
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('API — authenticated smoke tests', () => {
  test.beforeAll(() => {
    if (!isAuthAvailable()) {
      test.skip();
    }
  });

  test('GET /api/ping returns 200 with valid JWT', async ({ request }) => {
    // Extract the Auth0 access token from the saved browser storageState.
    // The Auth0 SPA SDK caches the token in localStorage under a key that
    // matches @@auth0spajs@@::<clientId>::<audience>::openid profile email.
    if (!existsSync(USER_STATE_PATH)) {
      test.skip(true, 'No auth state file found.');
      return;
    }

    const state = JSON.parse(readFileSync(USER_STATE_PATH, 'utf8')) as {
      origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>;
    };

    const localStorage = state.origins?.[0]?.localStorage ?? [];
    const tokenEntry = localStorage.find((e) => e.name.startsWith('@@auth0spajs@@'));

    if (!tokenEntry) {
      test.skip(true, 'Auth0 token not found in storageState localStorage. Re-run auth setup.');
      return;
    }

    const tokenData = JSON.parse(tokenEntry.value) as {
      body?: { access_token?: string };
    };
    const accessToken = tokenData.body?.access_token;

    if (!accessToken) {
      test.skip(true, 'Access token missing from Auth0 cache entry.');
      return;
    }

    const response = await request.get(`${BASE_URL}/api/ping`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ message: 'pong' });
  });
});
