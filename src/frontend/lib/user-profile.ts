import type { User } from '@auth0/auth0-react';

/** Auth0 root profile: both legal names must be present before using the app. */
export function profileRequiresLegalName(user: User | undefined): boolean {
  if (!user) {
    return true;
  }
  const given = typeof user.given_name === 'string' ? user.given_name.trim() : '';
  const family = typeof user.family_name === 'string' ? user.family_name.trim() : '';
  return given.length === 0 || family.length === 0;
}
