import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';
import { assertSupabaseConfig, config } from './config';

/**
 * Lazily-constructed, typed Supabase client (anon/publishable key, read-only via RLS).
 *
 * Built on first use so a missing-env error surfaces as a query error (rendered by the error-state
 * UI) rather than crashing the shell at import time.
 */
let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    assertSupabaseConfig();
    client = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}
