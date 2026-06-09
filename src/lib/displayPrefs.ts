/**
 * Display / accessibility preferences — text size + contrast, persisted ONLY to localStorage
 * (on-device, like theme.ts; never sent to a server). Applied to <html>:
 *   - text size scales the root font-size, so the rem-based type tokens scale with it;
 *   - high contrast sets data-contrast="high", which strengthens the token contrast in tokens.css.
 *
 * Same tiny external-store shape as personalStore / theme so React reads it via useSyncExternalStore.
 */
export type TextSize = 'default' | 'large' | 'larger';
export type Contrast = 'normal' | 'high';

export interface DisplayPrefs {
  textSize: TextSize;
  contrast: Contrast;
}

export const TEXT_SIZE_KEY = 'dbhs-wayfinder:text-size';
export const CONTRAST_KEY = 'dbhs-wayfinder:contrast';

const TEXT_SIZES = ['default', 'large', 'larger'] as const;
const CONTRASTS = ['normal', 'high'] as const;

/** Root font-size per text-size step (rem tokens scale off this). Mirrored in index.html's script. */
export const TEXT_SIZE_SCALE: Record<TextSize, string> = {
  default: '100%',
  large: '112.5%',
  larger: '125%',
};

function isTextSize(value: unknown): value is TextSize {
  return typeof value === 'string' && (TEXT_SIZES as readonly string[]).includes(value);
}
function isContrast(value: unknown): value is Contrast {
  return typeof value === 'string' && (CONTRASTS as readonly string[]).includes(value);
}

function load(): DisplayPrefs {
  let textSize: TextSize = 'default';
  let contrast: Contrast = 'normal';
  try {
    const t = localStorage.getItem(TEXT_SIZE_KEY);
    if (isTextSize(t)) textSize = t;
    const c = localStorage.getItem(CONTRAST_KEY);
    if (isContrast(c)) contrast = c;
  } catch {
    // ignore unavailable storage
  }
  return { textSize, contrast };
}

let current: DisplayPrefs = load();
const listeners = new Set<() => void>();

function apply(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.fontSize = TEXT_SIZE_SCALE[current.textSize];
  if (current.contrast === 'high') root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
}

function commit(next: DisplayPrefs, key: string, value: string): void {
  current = next;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / unavailable storage; in-memory state + applied prefs still update
  }
  apply();
  for (const listener of listeners) listener();
}

// ── External-store API ─────────────────────────────────────────────────────────
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): DisplayPrefs {
  return current;
}

export function setTextSize(textSize: TextSize): void {
  if (!isTextSize(textSize) || textSize === current.textSize) return;
  commit({ ...current, textSize }, TEXT_SIZE_KEY, textSize);
}

export function setContrast(contrast: Contrast): void {
  if (!isContrast(contrast) || contrast === current.contrast) return;
  commit({ ...current, contrast }, CONTRAST_KEY, contrast);
}

/** Apply saved prefs + wire cross-tab sync. Call once at startup (after the inline index.html script). */
export function initDisplayPrefs(): void {
  apply();
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key !== TEXT_SIZE_KEY && event.key !== CONTRAST_KEY) return;
    current = load();
    apply();
    for (const listener of listeners) listener();
  });
}
