/**
 * Terms-of-Service acceptance flag — on-device only (localStorage), same external-store shape as the
 * other prefs so the first-launch banner reacts to "I Understand" via useSyncExternalStore. Once
 * accepted, the banner never shows again.
 */
export const TOS_ACCEPTED_KEY = 'dbhs-wayfinder:tos-accepted';

function read(): boolean {
  try {
    return localStorage.getItem(TOS_ACCEPTED_KEY) === '1';
  } catch {
    return false;
  }
}

let accepted = read();
const listeners = new Set<() => void>();

export function subscribeTos(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTosAccepted(): boolean {
  return accepted;
}

export function acceptTos(): void {
  if (accepted) return;
  accepted = true;
  try {
    localStorage.setItem(TOS_ACCEPTED_KEY, '1');
  } catch {
    // ignore unavailable storage; the in-memory flag still hides the banner this session
  }
  for (const l of listeners) l();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== TOS_ACCEPTED_KEY) return;
    accepted = read();
    for (const l of listeners) l();
  });
}
