import { describe, expect, it } from 'vitest';

import { normalizeInviteEmails } from './invite-emails';

describe('normalizeInviteEmails', () => {
  it('dedupes and lowercases', () => {
    expect(normalizeInviteEmails(['A@B.COM', 'a@b.com', '  a@b.com '])).toEqual(['a@b.com']);
  });

  it('splits on commas semicolons and whitespace', () => {
    expect(normalizeInviteEmails(['a@b.com,b@c.com; d@e.com\nf@g.com'])).toEqual([
      'a@b.com',
      'b@c.com',
      'd@e.com',
      'f@g.com',
    ]);
  });

  it('drops tokens that are not plausible emails', () => {
    expect(normalizeInviteEmails(['not-an-email', 'ok@fine.com'])).toEqual(['ok@fine.com']);
  });
});
