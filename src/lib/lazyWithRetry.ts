import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * React.lazy with recovery for a failed dynamic import.
 *
 * A code-split chunk can fail to load on flaky Wi-Fi (which this app targets) or right after a
 * deploy — the already-open page's service worker references chunk hashes the new build replaced, so
 * the import 404s. Without recovery that throws into the screen-level error boundary, where "Try
 * again" only re-attempts the same dead import. Here, the first import failure forces ONE hard reload
 * to pull fresh chunks from the updated service worker; a sessionStorage guard prevents a reload loop
 * if the import is genuinely broken (then the error boundary shows as a last resort).
 *
 * Only IMPORT failures are caught — once the chunk loads, a render error in the component still
 * surfaces to the error boundary, so this never masks a real bug.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  key: string,
): LazyExoticComponent<T> {
  const flagKey = `wf:lazy-retry:${key}`;
  const readFlag = (): string | null => {
    try {
      return sessionStorage.getItem(flagKey);
    } catch {
      return null;
    }
  };
  const writeFlag = (value: string | null): void => {
    try {
      if (value === null) sessionStorage.removeItem(flagKey);
      else sessionStorage.setItem(flagKey, value);
    } catch {
      // sessionStorage can be unavailable (private mode / blocked) — recovery just degrades.
    }
  };

  return lazy(async () => {
    try {
      const mod = await factory();
      writeFlag(null);
      return mod;
    } catch (error) {
      if (!readFlag()) {
        writeFlag('1');
        window.location.reload();
        // Stay suspended until the reload takes over (never resolve).
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
