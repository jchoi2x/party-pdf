const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes, validates, and de-duplicates invite addresses from free-form input strings.
 */
export function normalizeInviteEmails(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of raw) {
    for (const part of entry.split(/[\s,;]+/)) {
      const e = part.trim().toLowerCase();
      if (e.length === 0 || seen.has(e)) {
        continue;
      }
      if (!EMAIL_RE.test(e)) {
        continue;
      }
      seen.add(e);
      out.push(e);
    }
  }

  return out;
}
