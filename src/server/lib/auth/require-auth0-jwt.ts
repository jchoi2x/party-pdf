import { createMiddleware } from 'hono/factory';
import type { JWTPayload } from 'jose';
import * as jose from 'jose';

const jwksByDomain = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>();

function getJwks(issuerHost: string) {
  const existing = jwksByDomain.get(issuerHost);
  if (existing) {
    return existing;
  }
  const jwks = jose.createRemoteJWKSet(new URL(`https://${issuerHost}/.well-known/jwks.json`));
  jwksByDomain.set(issuerHost, jwks);
  return jwks;
}

/** Strip scheme/path if present — binding may be domain-only or full issuer URL */
function issuerHostFromDomain(domain: string): string {
  const trimmed = domain.trim().replace(/\/+$/, '');
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).host;
    }
  } catch {
    // fall through
  }
  return trimmed.replace(/^https?:\/\//, '').split('/')[0] ?? trimmed;
}

export type Auth0JwtBindings = Pick<Env, 'AUTH0_DOMAIN' | 'AUTH0_AUDIENCE'>;

function readBearerOrQueryToken(c: { req: { header: (n: string) => string | undefined; url: string } }): string {
  const authHeader = c.req.header('Authorization');
  let token = authHeader?.startsWith('Bearer ') === true ? authHeader.slice('Bearer '.length).trim() : '';
  if (!token) {
    token = new URL(c.req.url).searchParams.get('access_token')?.trim() ?? '';
  }
  return token;
}

/**
 * Verifies an Auth0 RS256 access token using the tenant JWKS (`iss` + `aud`).
 * @throws On missing/invalid token or failed cryptographic verification.
 */
export async function verifyAuth0AccessToken(env: Auth0JwtBindings, token: string): Promise<JWTPayload> {
  const domainRaw = env.AUTH0_DOMAIN?.trim();
  const audience = env.AUTH0_AUDIENCE?.trim();
  if (!domainRaw || !audience) {
    throw new Error('Auth0 JWT verification is not configured (AUTH0_DOMAIN / AUTH0_AUDIENCE).');
  }
  if (!token) {
    throw new Error('Missing access token.');
  }
  const issuerHost = issuerHostFromDomain(domainRaw);
  const issuer = `https://${issuerHost}/`;
  const JWKS = getJwks(issuerHost);
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer,
    audience,
  });
  return payload;
}

/**
 * Hono middleware: verifies Auth0 access tokens via JWKS. Requires `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`.
 * Accepts `Authorization: Bearer <token>` or query `access_token` (e.g. WebSocket upgrade).
 */
export const requireAuth0Jwt = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const domainRaw = c.env.AUTH0_DOMAIN?.trim();
  const audience = c.env.AUTH0_AUDIENCE?.trim();
  if (!domainRaw || !audience) {
    return c.json({ error: 'Server Auth0 verification is not configured.' }, 500);
  }

  const token = readBearerOrQueryToken(c);

  if (!token) {
    return c.json({ error: 'Missing access token (Bearer or access_token query).' }, 401);
  }

  try {
    const payload = await verifyAuth0AccessToken(c.env, token);
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired access token.' }, 401);
  }
});
