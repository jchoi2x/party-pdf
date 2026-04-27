/**
 * SparkPost Transmissions API — transactional HTML email.
 * @see https://developers.sparkpost.com/api/transmissions.html
 */

const DEFAULT_TRANSMISSIONS_URL = 'https://api.sparkpost.com/api/v1/transmissions';

export type SparkPostMailBindings = Pick<Env, 'SPARKPOST_API_KEY' | 'EMAIL_FROM'>;

export function isSparkPostMailConfigured(env: SparkPostMailBindings): boolean {
  const key = env.SPARKPOST_API_KEY?.trim() ?? '';
  const from = env.EMAIL_FROM?.trim() ?? '';
  return key.length > 0 && from.length > 0;
}

export type SendSparkPostHtmlMailArgs = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text part; generated from HTML when omitted. */
  text?: string;
};

type SparkPostTransmissionResponse = {
  errors?: Array<{ message?: string; code?: string }>;
  results?: {
    total_rejected_recipients?: number;
    total_accepted_recipients?: number;
  };
};

function parseFromHeader(raw: string): { email: string; name?: string } {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) {
    const name = m[1].replace(/^["']|["']$/g, '').trim();
    const email = m[2].trim();
    return name.length > 0 ? { email, name } : { email };
  }
  return { email: trimmed };
}

function htmlToPlainFallback(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function transmissionsEndpoint(env: Env): string {
  const custom = env.SPARKPOST_TRANSMISSIONS_URL?.trim();
  if (custom && custom.length > 0) {
    return custom.replace(/\/+$/, '');
  }
  return DEFAULT_TRANSMISSIONS_URL;
}

export async function sendSparkPostHtmlMail(env: Env, args: SendSparkPostHtmlMailArgs): Promise<void> {
  if (!isSparkPostMailConfigured(env)) {
    throw new Error('SparkPost is not configured (SPARKPOST_API_KEY / EMAIL_FROM).');
  }

  const apiKey = env.SPARKPOST_API_KEY.trim();
  const from = parseFromHeader(env.EMAIL_FROM);
  const text = args.text ?? htmlToPlainFallback(args.html);

  const body = {
    options: {
      transactional: true,
    },
    content: {
      from: {
        email: from.email,
        ...(from.name ? { name: from.name } : {}),
      },
      subject: args.subject,
      html: args.html,
      text,
    },
    recipients: [{ address: { email: args.to.trim() } }],
  };

  const res = await fetch(transmissionsEndpoint(env), {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let json: SparkPostTransmissionResponse | undefined;
  try {
    json = JSON.parse(raw) as SparkPostTransmissionResponse;
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const msg =
      json?.errors
        ?.map((e) => e.message ?? e.code)
        .filter(Boolean)
        .join('; ') ?? raw.slice(0, 500);
    throw new Error(`SparkPost transmission failed (${res.status}): ${msg}`);
  }

  if (json?.errors && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message ?? e.code).join('; ');
    throw new Error(`SparkPost transmission error: ${msg}`);
  }

  const rejected = json?.results?.total_rejected_recipients ?? 0;
  if (rejected > 0) {
    throw new Error(`SparkPost rejected ${rejected} recipient(s).`);
  }
}
