export type Auth0ManagementBindings = Pick<
  Env,
  'AUTH0_DOMAIN' | 'AUTH0_MANAGEMENT_CLIENT_ID' | 'AUTH0_MANAGEMENT_CLIENT_SECRET'
>;

function tenantHost(domainRaw: string): string {
  const trimmed = domainRaw.trim().replace(/\/+$/, '');
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).host;
    }
  } catch {
    // fall through
  }
  return trimmed.replace(/^https?:\/\//, '').split('/')[0] ?? trimmed;
}

export function isAuth0ManagementConfigured(env: Auth0ManagementBindings): boolean {
  const id = env.AUTH0_MANAGEMENT_CLIENT_ID?.trim() ?? '';
  const secret = env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim() ?? '';
  const domain = env.AUTH0_DOMAIN?.trim() ?? '';
  return id.length > 0 && secret.length > 0 && domain.length > 0;
}

async function fetchManagementAccessToken(env: Auth0ManagementBindings): Promise<string> {
  const host = tenantHost(env.AUTH0_DOMAIN);
  const tokenUrl = `https://${host}/oauth/token`;
  const audience = `https://${host}/api/v2/`;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.AUTH0_MANAGEMENT_CLIENT_ID.trim(),
      client_secret: env.AUTH0_MANAGEMENT_CLIENT_SECRET.trim(),
      audience,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Auth0 token endpoint failed (${res.status}): ${raw.slice(0, 500)}`);
  }
  const json = JSON.parse(raw) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('Auth0 token response missing access_token');
  }
  return json.access_token;
}

/**
 * Updates root profile fields on the Auth0 user (Management API).
 * `userId` must be the JWT `sub` (e.g. `auth0|abc` or `google-oauth2|...`).
 */
export async function patchAuth0UserNames(
  env: Auth0ManagementBindings,
  userId: string,
  givenName: string,
  familyName: string,
): Promise<void> {
  const host = tenantHost(env.AUTH0_DOMAIN);
  const managementToken = await fetchManagementAccessToken(env);
  const displayName = `${givenName.trim()} ${familyName.trim()}`.trim();

  const url = `https://${host}/api/v2/users/${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${managementToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      given_name: givenName.trim(),
      family_name: familyName.trim(),
      name: displayName,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Auth0 PATCH user failed (${res.status}): ${errBody.slice(0, 800)}`);
  }
}

export type Auth0UserIdLookup = { userId: string };

/**
 * Returns the Auth0 user id (`sub` / `user_id`) for an email, or null if no user exists.
 * Requires Management API scope `read:users`.
 */
export async function findAuth0UserByEmail(
  env: Auth0ManagementBindings,
  email: string,
): Promise<Auth0UserIdLookup | null> {
  const host = tenantHost(env.AUTH0_DOMAIN);
  const managementToken = await fetchManagementAccessToken(env);
  const url = `https://${host}/api/v2/users-by-email?email=${encodeURIComponent(email.trim())}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${managementToken}` },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth0 users-by-email failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data: unknown = await res.json();
  if (Array.isArray(data)) {
    const first = data[0] as { user_id?: string } | undefined;
    const id = first?.user_id;
    if (typeof id === 'string' && id.length > 0) {
      return { userId: id };
    }
    return null;
  }

  if (data && typeof data === 'object' && 'user_id' in data) {
    const id = (data as { user_id: unknown }).user_id;
    if (typeof id === 'string' && id.length > 0) {
      return { userId: id };
    }
  }

  return null;
}

const DEFAULT_DB_CONNECTION = 'Username-Password-Authentication';

function secureRandomPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_';
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function databaseConnectionName(env: Pick<Env, 'AUTH0_DATABASE_CONNECTION'>): string {
  const c = env.AUTH0_DATABASE_CONNECTION?.trim();
  return c && c.length > 0 ? c : DEFAULT_DB_CONNECTION;
}

/**
 * `/dbconnections/signup` may return only the local provider id (e.g. 24-char hex).
 * Management API tickets and JWT `sub` use `auth0|<localId>` for the default database connection.
 */
function normalizeAuth0DatabaseUserId(userId: string): string {
  const t = userId.trim();
  if (t.length === 0 || t.includes('|')) {
    return t;
  }
  return `auth0|${t}`;
}

function signupResponseUserId(json: { user_id?: string; _id?: string; Id?: string }): string | undefined {
  const candidates = [json.user_id, json._id, json.Id];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return undefined;
}

function looksLikeAuth0UserAlreadyExists(status: number, body: string): boolean {
  if (status !== 400 && status !== 409) {
    return false;
  }
  const b = body.toLowerCase();
  return (
    b.includes('user already exists') ||
    b.includes('user_exists') ||
    b.includes('the user already exists') ||
    b.includes('"code":"user_exists"')
  );
}

/**
 * Creates a database user via Authentication API `POST /dbconnections/signup` using `AUTH0_CLIENT_ID`
 * (the same application users log in with). That app can have the DB connection enabled; M2M clients
 * often cannot, which breaks Management API `POST /api/v2/users` for the same tenant.
 *
 * Requires the application to allow sign-ups for that connection. On duplicate email, resolves id via
 * Management API `users-by-email` (`read:users`).
 */
export async function createAuth0DatabaseUser(
  env: Auth0ManagementBindings & Pick<Env, 'AUTH0_CLIENT_ID' | 'AUTH0_DATABASE_CONNECTION'>,
  email: string,
): Promise<{ userId: string }> {
  const clientId = env.AUTH0_CLIENT_ID?.trim() ?? '';
  if (!clientId) {
    throw new Error('AUTH0_CLIENT_ID is required for database sign-up provisioning.');
  }

  const host = tenantHost(env.AUTH0_DOMAIN);
  const connection = databaseConnectionName(env);
  const url = `https://${host}/dbconnections/signup`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      email: email.trim(),
      password: secureRandomPassword(),
      connection,
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    if (looksLikeAuth0UserAlreadyExists(res.status, raw)) {
      const existing = await findAuth0UserByEmail(env, email);
      if (existing) {
        return { userId: normalizeAuth0DatabaseUserId(existing.userId) };
      }
    }
    throw new Error(`Auth0 database sign-up failed (${res.status}): ${raw.slice(0, 500)}`);
  }

  let json: { user_id?: string; _id?: string; Id?: string };
  try {
    json = JSON.parse(raw) as { user_id?: string; _id?: string; Id?: string };
  } catch {
    throw new Error('Auth0 database sign-up response was not JSON');
  }

  const fromBody = signupResponseUserId(json);
  if (fromBody) {
    return { userId: normalizeAuth0DatabaseUserId(fromBody) };
  }

  const existing = await findAuth0UserByEmail(env, email);
  if (!existing) {
    throw new Error('Auth0 database sign-up succeeded but user id could not be resolved.');
  }
  return { userId: normalizeAuth0DatabaseUserId(existing.userId) };
}

/**
 * One-time link for the user to set their password.
 *
 * - **Classic Universal Login**: `result_url` is honored after a successful password change (must be in the
 *   application’s **Allowed Callback URLs**).
 * - **New Universal Login**: `result_url` is often **ignored**; Auth0 may only offer redirect to the application’s
 *   [default login route](https://auth0.com/docs/universal-login/configure-default-login-routes). Passing
 *   `client_id` enables that path. Prefer Classic UL for invite flows that need a per-ticket `result_url`, or
 *   include a direct deep link in your own email as a fallback.
 *
 * Requires `create:user_tickets`.
 */
export async function createAuth0PasswordChangeTicket(
  env: Auth0ManagementBindings & Pick<Env, 'AUTH0_CLIENT_ID'>,
  userId: string,
  resultUrl: string,
): Promise<string> {
  const host = tenantHost(env.AUTH0_DOMAIN);
  const managementToken = await fetchManagementAccessToken(env);
  const url = `https://${host}/api/v2/tickets/password-change`;
  const normalizedUserId = normalizeAuth0DatabaseUserId(userId);

  const body: Record<string, unknown> = {
    user_id: normalizedUserId,
    result_url: resultUrl,
    ttl_sec: 86_400 * 5,
    mark_email_as_verified: true,
  };
  const clientId = env.AUTH0_CLIENT_ID?.trim();
  if (clientId) {
    body.client_id = clientId;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${managementToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Auth0 password-change ticket failed (${res.status}): ${raw.slice(0, 500)}`);
  }

  let json: { ticket?: string };
  try {
    json = JSON.parse(raw) as { ticket?: string };
  } catch {
    throw new Error('Auth0 password-change ticket response was not JSON');
  }

  const ticket = json.ticket?.trim();
  if (!ticket) {
    throw new Error('Auth0 password-change ticket response missing ticket');
  }
  return ticket;
}
