if (!import.meta.env.APRYSE_LICENSE) {
  console.error('APRYSE_LICENSE environment variable is not set.');
}
if (!import.meta.env.WEBVIEWER_CDN) {
  console.error('WEBVIEWER_CDN environment variable is not set.');
}

export const variables = {
  apiBase: `${window.location.origin}/api`,
  apryseLicense: import.meta.env.APRYSE_LICENSE,
  agGridLicenseKey: import.meta.env.AG_GRID_LICENSE_KEY,
  webviewerCdn: import.meta.env.WEBVIEWER_CDN,
  auth0Domain: import.meta.env.AUTH0_DOMAIN,
  auth0ClientId: import.meta.env.AUTH0_CLIENT_ID,
  auth0Audience: import.meta.env.AUTH0_AUDIENCE,
};

// biome-ignore lint/suspicious/noExplicitAny: for debugging
(window as any).variables = variables;
export const vars = variables;
