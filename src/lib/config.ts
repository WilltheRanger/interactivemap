/**
 * Typed runtime config. The app uses ONLY the Supabase anon/publishable key (read-only via RLS).
 *
 * Reading config never throws at import time, so the shell can boot before Supabase is wired.
 * Call `assertSupabaseConfig()` at the point a Supabase client is constructed (Phase 02) to fail
 * loudly when env is missing.
 */
export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  /** Where "Report wrong info" sends mail. Set VITE_FEEDBACK_EMAIL to a real address before launch. */
  feedbackEmail: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
// `.example` is a reserved placeholder TLD (RFC 2606) — clearly not a real inbox until configured.
const feedbackEmail = import.meta.env.VITE_FEEDBACK_EMAIL ?? 'wayfinder@dbhs.example';

export const config: AppConfig = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  feedbackEmail,
};

export function assertSupabaseConfig(): void {
  if (!config.isSupabaseConfigured) {
    throw new Error(
      'Missing Supabase env. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
}

if (import.meta.env.DEV && !config.isSupabaseConfigured) {
  console.warn(
    '[config] Supabase env not set — reference-data calls will fail until .env is configured.',
  );
}
