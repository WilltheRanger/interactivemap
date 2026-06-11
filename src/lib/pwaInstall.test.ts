import { afterEach, describe, expect, it } from 'vitest';
import { dismissInstall, getInstallSnapshot, INSTALL_DISMISSED_KEY } from './pwaInstall';

describe('pwaInstall', () => {
  afterEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it('stays hidden in a plain (non-installed, non-iOS) browser tab with no captured prompt', () => {
    const s = getInstallSnapshot();
    expect(s.canInstall).toBe(false);
    expect(s.iosInstall).toBe(false);
    expect(s.installed).toBe(false);
  });

  it('remembers a dismissal in localStorage and the snapshot', () => {
    dismissInstall();
    expect(getInstallSnapshot().dismissed).toBe(true);
    expect(localStorage.getItem(INSTALL_DISMISSED_KEY)).toBe('1');
  });
});
