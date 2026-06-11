/**
 * "Add to Home Screen" prompt state, kept as a tiny external store (same shape as theme.ts /
 * displayPrefs.ts so React reads it via useSyncExternalStore).
 *
 * Chromium fires `beforeinstallprompt`, which we capture so a button can open the native install
 * dialog on demand. iOS Safari has no such event — the only way in is the Share sheet — so there we
 * surface manual instructions instead of a dead button. A dismissal is remembered in localStorage
 * (on-device only, like every other personal flag) so we never nag the student twice.
 */

/** The non-standard event Chromium fires; not in lib.dom, so we type it locally. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export const INSTALL_DISMISSED_KEY = 'dbhs-wayfinder:install-dismissed';

export interface InstallState {
  /** Native prompt captured (Chromium / Android) — a button can trigger it. */
  canInstall: boolean;
  /** iOS Safari, not yet installed — can only be added via the Share sheet. */
  iosInstall: boolean;
  /** Already running as an installed/standalone app. */
  installed: boolean;
  /** Student closed the prompt; don't show it again. */
  dismissed: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayMode = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
  // iOS Safari reports installed launches via the non-standard navigator.standalone.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iosDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ masquerades as a Mac; a touch-capable "Macintosh" is really an iPad.
  const iPadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return iosDevice || iPadOs;
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  } catch {
    // ignore quota / unavailable storage; the in-memory flag below still hides the prompt
  }
}

function build(): InstallState {
  const installed = isStandalone();
  return {
    canInstall: deferred !== null && !installed,
    iosInstall: isIos() && !installed && deferred === null,
    installed,
    dismissed: readDismissed(),
  };
}

let current: InstallState = build();

function update(): void {
  current = build();
  for (const listener of listeners) listener();
}

// ── External-store API (for useSyncExternalStore) ───────────────────────────────
export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallSnapshot(): InstallState {
  return current;
}

/** Open the native install dialog (Chromium only). No-op if no prompt was captured. */
export async function promptInstall(): Promise<void> {
  const evt = deferred;
  if (!evt) return;
  deferred = null;
  update(); // hide the button while the native dialog is open
  try {
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === 'accepted') persistDismissed(); // `appinstalled` also fires
  } catch {
    // a consumed/late event can reject; nothing actionable
  }
  update();
}

/** Student tapped ✕ — remember it so the banner stays gone. */
export function dismissInstall(): void {
  persistDismissed();
  update();
}

/** Attach the global listeners once at startup (call from main.tsx, like initTheme). */
export function initPwaInstall(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    // Stop Chrome's mini-infobar; we drive the prompt from our own button instead.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    update();
  });
}
