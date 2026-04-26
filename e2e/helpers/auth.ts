import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import { AUTH0_DOMAIN, E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD } from './env';

export const AUTH_DIR = 'e2e/.auth';
export const USER_STATE_PATH = `${AUTH_DIR}/user.json`;
export const SETUP_META_PATH = `${AUTH_DIR}/setup.json`;

/** Persist the auth setup result so tests can read it synchronously. */
export function writeAuthMeta(authenticated: boolean): void {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(SETUP_META_PATH, JSON.stringify({ authenticated }));
}

/** Read whether global-setup successfully authenticated. */
export function isAuthAvailable(): boolean {
  try {
    if (!existsSync(SETUP_META_PATH)) return false;
    const meta = JSON.parse(readFileSync(SETUP_META_PATH, 'utf8')) as { authenticated?: boolean };
    return meta.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * Automates the Auth0 Universal Login form.
 *
 * Limitations:
 *   - Requires standard Auth0 New Universal Login (username + password fields).
 *   - Will fail if MFA is enforced or CAPTCHA is shown.
 *   - Uses the hosted login page — ROPC grant is not used because it bypasses
 *     Auth0's brute-force protection and requires an explicit tenant allowlist.
 *
 * @returns true on success, false if login could not be completed.
 */
export async function loginViaAuth0UniversalLogin(page: Page, baseURL: string): Promise<boolean> {
  try {
    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30_000 });

    const afterNav = page.url();

    // If the app didn't redirect to Auth0 the session is already active.
    if (!afterNav.includes(AUTH0_DOMAIN) && !afterNav.includes('auth0.com')) {
      return true;
    }

    // Auth0 Universal Login — "New" UX selectors (as of 2024–2026)
    await page
      .locator('input[name="username"], input[id="username"], input[type="email"]')
      .first()
      .fill(E2E_LOGIN_EMAIL, { timeout: 10_000 });

    await page
      .locator('input[name="password"], input[id="password"], input[type="password"]')
      .first()
      .fill(E2E_LOGIN_PASSWORD, { timeout: 10_000 });

    await page
      .locator(
        'button[type="submit"][name="action"], ' + 'button[data-action-button-primary], ' + 'button[type="submit"]',
      )
      .first()
      .click();

    // Wait until the browser leaves the Auth0 domain
    await page.waitForURL((url) => !url.hostname.includes('auth0') && !url.hostname.includes(AUTH0_DOMAIN), {
      timeout: 30_000,
    });

    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    return true;
  } catch (err) {
    console.warn('[E2E auth] Auth0 Universal Login failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

/**
 * Full auth setup: launch a Chromium instance, log in, and save storageState.
 * Writes USER_STATE_PATH and SETUP_META_PATH regardless of outcome.
 */
export async function runAuthSetup(baseURL: string): Promise<void> {
  const emptyState = JSON.stringify({ cookies: [], origins: [] });

  if (!E2E_LOGIN_EMAIL || !E2E_LOGIN_PASSWORD || !AUTH0_DOMAIN) {
    console.warn(
      '[E2E setup] Missing E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD, or AUTH0_DOMAIN in .dev.vars.\n' +
        '           Authenticated tests will be skipped automatically.',
    );
    mkdirSync(AUTH_DIR, { recursive: true });
    writeFileSync(USER_STATE_PATH, emptyState);
    writeAuthMeta(false);
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const ok = await loginViaAuth0UniversalLogin(page, baseURL);
    if (ok) {
      const state = await context.storageState();
      mkdirSync(AUTH_DIR, { recursive: true });
      writeFileSync(USER_STATE_PATH, JSON.stringify(state));
      writeAuthMeta(true);
      console.info('[E2E setup] Auth0 login successful — storage state saved.');
    } else {
      mkdirSync(AUTH_DIR, { recursive: true });
      writeFileSync(USER_STATE_PATH, emptyState);
      writeAuthMeta(false);
    }
  } finally {
    await browser.close();
  }
}
