import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';
import { assertSupabaseConfig, config } from './config';

/**
 * Lazily-constructed, typed Supabase client (anon/publishable key; reads are open via RLS, writes
 * require a whitelisted admin session — see /admin).
 *
 * Built on first use so a missing-env error surfaces as a query error (rendered by the error-state
 * UI) rather than crashing the shell at import time.
 *
 * Auth uses the library defaults (persisted session + detectSessionInUrl) so the /admin Google
 * OAuth redirect completes. Students never sign in, so no session — and no personal data — exists
 * for them; the privacy split (CLAUDE.md) is unchanged.
 */
let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    assertSupabaseConfig();
    client = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey);
  }
  return client;
}
