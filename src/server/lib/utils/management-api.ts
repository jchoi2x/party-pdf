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

type Auth0UserLookupResult = {
  userId: string;
  email: string;
};

/**
 * Looks up a user by email using the Auth0 Management API.
 * Returns `null` when no matching user exists.
 */
export async function findAuth0UserByEmail(
  env: Auth0ManagementBindings,
  email: string,
): Promise<Auth0UserLookupResult | null> {
  const host = tenantHost(env.AUTH0_DOMAIN);
  const managementToken = await fetchManagementAccessToken(env);
  const normalizedEmail = email.trim().toLowerCase();
  const url = `https://${host}/api/v2/users-by-email?email=${encodeURIComponent(normalizedEmail)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${managementToken}`,
      'Content-Type': 'application/json',
    },
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Auth0 users-by-email failed (${res.status}): ${raw.slice(0, 800)}`);
  }

  const parsed = JSON.parse(raw) as Array<{ user_id?: string; email?: string }>;
  const first = parsed.find(
    (entry) =>
      typeof entry.user_id === 'string' &&
      entry.user_id.length > 0 &&
      typeof entry.email === 'string' &&
      entry.email.length > 0,
  );
  if (!first) {
    return null;
  }
  return {
    userId: first.user_id!,
    email: first.email!.trim().toLowerCase(),
  };
}
