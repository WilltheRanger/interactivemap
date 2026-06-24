import { describe, expect, it } from 'vitest';
import { CONTRAST_KEY, getSnapshot, setContrast, setTextSize, TEXT_SIZE_KEY } from './displayPrefs';

describe('setTextSize', () => {
  it('updates the snapshot, persists, and scales the root font-size', () => {
    setTextSize('large');
    expect(getSnapshot().textSize).toBe('large');
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe('large');
    expect(document.documentElement.style.fontSize).toBe('112.5%');

    setTextSize('default');
    expect(document.documentElement.style.fontSize).toBe('100%');
  });

  it('ignores invalid values', () => {
    setTextSize('default');
    // @ts-expect-error — exercising the runtime guard
    setTextSize('huge');
    expect(getSnapshot().textSize).toBe('default');
  });
});

describe('setContrast', () => {
  it('toggles the data-contrast attribute and persists', () => {
    setContrast('high');
    expect(getSnapshot().contrast).toBe('high');
    expect(localStorage.getItem(CONTRAST_KEY)).toBe('high');
    expect(document.documentElement.dataset.contrast).toBe('high');

    setContrast('normal');
    expect(getSnapshot().contrast).toBe('normal');
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });
});
