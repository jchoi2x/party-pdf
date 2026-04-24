/** Best-effort display name from JWT / OIDC-style claim keys (Auth0 access token varies by rules). */
export function displayNameFromJwtClaims(claims: Record<string, unknown>): string {
  const pick = (key: string): string | undefined => {
    const v = claims[key];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
  };

  return (
    pick('name') ??
    pick('nickname') ??
    pick('preferred_username') ??
    pick('email') ??
    pickFromNamespacedEmail(claims) ??
    fallbackFromSub(claims.sub)
  );
}

function pickFromNamespacedEmail(claims: Record<string, unknown>): string | undefined {
  for (const key of Object.keys(claims)) {
    if (key.endsWith('/email')) {
      const v = claims[key];
      if (typeof v === 'string' && v.includes('@')) {
        return v.trim();
      }
    }
  }
  return undefined;
}

function fallbackFromSub(sub: unknown): string {
  if (typeof sub !== 'string' || !sub.trim()) {
    return 'Account';
  }
  if (sub.includes('@')) {
    return sub;
  }
  const parts = sub.split('|');
  const last = parts[parts.length - 1];
  return last && last.length > 0 ? last : 'Account';
}
