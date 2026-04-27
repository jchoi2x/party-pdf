const defaultBaseUrl = 'http://localhost:5173';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseUrl;
export const appOrigin = new URL(baseURL).origin;
export const appOrAuthRegex = new RegExp(`${escapeRegex(appOrigin)}|auth0\\.com`);
