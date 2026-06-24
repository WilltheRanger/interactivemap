import { describe, expect, it } from 'vitest';
import { isAdminEmail, isAllowedEmail } from './authPolicy';

describe('isAllowedEmail', () => {
  it('allows student accounts', () => {
    expect(isAllowedEmail('jdoe25@stu.wvusd.org')).toBe(true);
  });

  it('allows staff accounts', () => {
    expect(isAllowedEmail('teacher@wvusd.org')).toBe(true);
  });

  it('allows whitelisted admins outside the school domains', () => {
    expect(isAllowedEmail('aryamshah2@gmail.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAllowedEmail('JDoe25@STU.WVUSD.ORG')).toBe(true);
  });

  it('rejects other domains', () => {
    expect(isAllowedEmail('someone@gmail.com')).toBe(false);
    expect(isAllowedEmail('x@evilwvusd.org')).toBe(false); // lookalike, no @-boundary
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail('')).toBe(false);
  });
});

describe('isAdminEmail', () => {
  it('matches only the whitelist', () => {
    expect(isAdminEmail('aryamshah2@gmail.com')).toBe(true);
    expect(isAdminEmail('jdoe25@stu.wvusd.org')).toBe(false);
  });
});
