import { describe, expect, it } from 'vitest';
import { isAllowedHallPassUrl } from './hallPass';

describe('isAllowedHallPassUrl', () => {
  it('allows approved Google Form links', () => {
    for (const url of [
      'https://forms.gle/AbC123xyz',
      'https://forms.google.com/something',
      'https://docs.google.com/forms/d/e/1FAIpQLSxxxx/viewform',
      'https://docs.google.com/forms/d/e/1FAIpQLSxxxx/viewform?usp=sf_link',
      '  https://forms.gle/AbC123xyz  ', // trimmed
    ]) {
      expect(isAllowedHallPassUrl(url)).toBe(true);
    }
  });

  it('rejects non-https', () => {
    expect(isAllowedHallPassUrl('http://forms.gle/AbC123xyz')).toBe(false);
  });

  it('rejects non-Form Google surfaces', () => {
    expect(isAllowedHallPassUrl('https://docs.google.com/spreadsheets/d/abc/edit')).toBe(false);
    expect(isAllowedHallPassUrl('https://docs.google.com/document/d/abc/edit')).toBe(false);
    expect(isAllowedHallPassUrl('https://drive.google.com/file/d/abc/view')).toBe(false);
  });

  it('rejects look-alike hosts and arbitrary sites', () => {
    expect(isAllowedHallPassUrl('https://forms.gle.evil.com/AbC')).toBe(false);
    expect(isAllowedHallPassUrl('https://evil.com/forms/')).toBe(false);
    expect(isAllowedHallPassUrl('https://notdocs.google.com/forms/x')).toBe(false);
  });

  it('rejects junk and empty input', () => {
    for (const bad of ['', '   ', 'not a url', 'javascript:alert(1)', 'forms.gle/AbC']) {
      expect(isAllowedHallPassUrl(bad)).toBe(false);
    }
  });
});
