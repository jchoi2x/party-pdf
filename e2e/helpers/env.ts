/**
 * Typed accessors for E2E environment variables.
 * All values are read from .dev.vars (loaded by playwright.config.ts via dotenv).
 */

/** Auth0 tenant domain (e.g. "my-tenant.us.auth0.com") */
export const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN ?? '';

/** Auth0 SPA client ID */
export const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID ?? '';

/** Auth0 API audience (optional) */
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE ?? '';

/** E2E test account email */
export const E2E_LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL ?? '';

/** E2E test account password */
export const E2E_LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? '';

/** True when all Auth0 credentials required for E2E login are present */
export const AUTH0_CONFIGURED =
  AUTH0_DOMAIN.length > 0 && AUTH0_CLIENT_ID.length > 0 && E2E_LOGIN_EMAIL.length > 0 && E2E_LOGIN_PASSWORD.length > 0;
