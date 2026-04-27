import fs from 'node:fs';
import path from 'node:path';

export interface Credentials {
  email?: string;
  password?: string;
}

function parseDotEnvFile(raw: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = value;
  }

  return result;
}

export function getE2ECredentials(): Credentials {
  const fromEnv: Credentials = {
    email: process.env.E2E_LOGIN_EMAIL,
    password: process.env.E2E_LOGIN_PASSWORD,
  };

  if (fromEnv.email && fromEnv.password) {
    return fromEnv;
  }

  const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
  if (!fs.existsSync(devVarsPath)) {
    return fromEnv;
  }

  const raw = fs.readFileSync(devVarsPath, 'utf8');
  const parsed = parseDotEnvFile(raw);

  return {
    email: fromEnv.email ?? parsed.E2E_LOGIN_EMAIL,
    password: fromEnv.password ?? parsed.E2E_LOGIN_PASSWORD,
  };
}
