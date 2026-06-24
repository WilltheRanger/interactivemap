import { describe, expect, it } from 'vitest';
import { getSnapshot, resolveTheme, setPreference, THEME_KEY } from './theme';

describe('resolveTheme', () => {
  it('returns the explicit preference for light/dark', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it("resolves 'system' to a concrete light/dark value", () => {
    expect(['light', 'dark']).toContain(resolveTheme('system'));
  });
});

describe('setPreference', () => {
  it('updates the snapshot and persists to localStorage', () => {
    setPreference('dark');
    expect(getSnapshot().preference).toBe('dark');
    expect(getSnapshot().resolved).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    setPreference('light');
    expect(getSnapshot().preference).toBe('light');
    expect(getSnapshot().resolved).toBe('light');
  });

  it('ignores invalid values', () => {
    setPreference('light');
    // @ts-expect-error — exercising the runtime guard against bad input
    setPreference('rainbow');
    expect(getSnapshot().preference).toBe('light');
  });

  it('reflects the resolved theme on the document element', () => {
    setPreference('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    setPreference('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
