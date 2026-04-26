import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { runAuthSetup } from './helpers/auth';

dotenv.config({ path: '.dev.vars' });

const PDF_FIXTURE_PATH = path.resolve('e2e/fixtures/minimal.pdf');

/**
 * Generate a well-formed minimal single-page PDF fixture.
 * Byte offsets in the xref table are computed at runtime so they are always correct.
 */
function ensureMinimalPdf(): void {
  if (existsSync(PDF_FIXTURE_PATH)) return;

  mkdirSync(path.dirname(PDF_FIXTURE_PATH), { recursive: true });

  let content = '';
  const offsets: number[] = [];

  content += '%PDF-1.4\n';

  offsets.push(Buffer.byteLength(content));
  content += '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n';

  offsets.push(Buffer.byteLength(content));
  content += '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n';

  offsets.push(Buffer.byteLength(content));
  content += '3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\n';

  const xrefOffset = Buffer.byteLength(content);

  // xref entries must be exactly 20 bytes including the trailing " \n"
  const entry = (n: number) => `${String(n).padStart(10, '0')} 00000 n \n`;

  content += [
    'xref\n',
    '0 4\n',
    '0000000000 65535 f \n',
    entry(offsets[0]),
    entry(offsets[1]),
    entry(offsets[2]),
    'trailer\n',
    '<</Size 4 /Root 1 0 R>>\n',
    'startxref\n',
    `${xrefOffset}\n`,
    '%%EOF\n',
  ].join('');

  writeFileSync(PDF_FIXTURE_PATH, content, 'utf8');
  console.info('[E2E setup] Created e2e/fixtures/minimal.pdf');
}

export default async function globalSetup(): Promise<void> {
  ensureMinimalPdf();

  const PORT = process.env.PORT ?? '3000';
  const baseURL = `http://localhost:${PORT}`;

  await runAuthSetup(baseURL);
}
