const auth0Domain = import.meta.env.AUTH0_DOMAIN?.trim() ?? '';
const auth0ClientId = import.meta.env.AUTH0_CLIENT_ID?.trim() ?? '';
const auth0Audience = import.meta.env.AUTH0_AUDIENCE?.trim() ?? '';

export const isAuth0Configured = auth0Domain.length > 0 && auth0ClientId.length > 0;

export function getAuth0ApiAudience(): string | undefined {
  return auth0Audience.length > 0 ? auth0Audience : undefined;
}

export function getAuth0Config() {
  if (!isAuth0Configured) {
    throw new Error('Missing AUTH0_DOMAIN or AUTH0_CLIENT_ID environment variables.');
  }

  return {
    domain: auth0Domain,
    clientId: auth0ClientId,
    audience: getAuth0ApiAudience(),
  };
}
