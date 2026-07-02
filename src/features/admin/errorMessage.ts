/**
 * Human-readable message for any thrown value. Handles plain `Error`s AND Supabase's error objects
 * (PostgrestError / StorageError), which are NOT `Error` instances — a bare `instanceof Error` check
 * drops their `.message` on the floor and shows "unknown error", hiding the real cause (RLS denial,
 * duplicate key, etc.). Appends the SQLSTATE code when present so a support request can pin it down.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown };
    if (typeof e.message === 'string' && e.message) {
      return typeof e.code === 'string' && e.code ? `${e.message} (${e.code})` : e.message;
    }
  }
  return 'unknown error';
}
