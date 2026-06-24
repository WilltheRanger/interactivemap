import { describe, expect, it } from 'vitest';
import { buildHallPassUrl, isAllowedHallPassUrl } from './hallPass';

describe('isAllowedHallPassUrl', () => {
  it('allows approved Apps Script web-app endpoints', () => {
    for (const url of [
      'https://script.google.com/macros/s/AKfycbxDEPLOYID/exec',
      'https://script.google.com/a/macros/wvusd.org/s/AKfycbxDEPLOYID/exec',
      'https://script.google.com/macros/s/AKfycbxDEPLOYID/exec?reason=Bathroom',
      '  https://script.google.com/macros/s/AKfycbxDEPLOYID/exec  ', // trimmed
    ]) {
      expect(isAllowedHallPassUrl(url)).toBe(true);
    }
  });

  it('rejects non-https', () => {
    expect(isAllowedHallPassUrl('http://script.google.com/macros/s/ID/exec')).toBe(false);
  });

  it('rejects non-exec Apps Script paths and other Google surfaces', () => {
    expect(isAllowedHallPassUrl('https://script.google.com/macros/s/ID/dev')).toBe(false);
    expect(isAllowedHallPassUrl('https://script.google.com/home')).toBe(false);
    expect(isAllowedHallPassUrl('https://script.googleusercontent.com/macros/echo')).toBe(false);
    expect(isAllowedHallPassUrl('https://forms.gle/AbC123xyz')).toBe(false);
    expect(isAllowedHallPassUrl('https://docs.google.com/forms/d/e/ID/viewform')).toBe(false);
  });

  it('rejects look-alike hosts and junk', () => {
    expect(isAllowedHallPassUrl('https://script.google.com.evil.com/macros/s/ID/exec')).toBe(false);
    expect(isAllowedHallPassUrl('https://evil.com/macros/s/ID/exec')).toBe(false);
    for (const bad of ['', '   ', 'not a url', 'javascript:alert(1)']) {
      expect(isAllowedHallPassUrl(bad)).toBe(false);
    }
  });
});

describe('buildHallPassUrl', () => {
  const base = 'https://script.google.com/macros/s/AKfycbxDEPLOYID/exec';

  it('appends the reason to an approved endpoint', () => {
    expect(buildHallPassUrl(base, 'Bathroom')).toBe(`${base}?reason=Bathroom`);
  });

  it('appends the signed-in student id when given', () => {
    expect(buildHallPassUrl(base, 'Bathroom', 'jdoe@stu.wvusd.org')).toBe(
      `${base}?reason=Bathroom&student=jdoe%40stu.wvusd.org`,
    );
  });

  it('url-encodes the reason', () => {
    expect(buildHallPassUrl(base, 'Front Office')).toBe(`${base}?reason=Front+Office`);
  });

  it('omits params when not given', () => {
    expect(buildHallPassUrl(base, '')).toBe(base);
  });

  it('returns null for a disallowed scanned URL', () => {
    expect(buildHallPassUrl('https://evil.com/macros/s/ID/exec', 'Bathroom')).toBeNull();
  });
});
