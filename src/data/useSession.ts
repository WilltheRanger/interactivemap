import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

interface SessionState {
  /** True until the initial getSession() resolves. */
  loading: boolean;
  session: Session | null;
}

/**
 * Live Supabase auth session: initial fetch + subscription to sign-in/out changes.
 * Callers must ensure Supabase is configured (config.isSupabaseConfigured) first.
 */
export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({ loading: true, session: null });

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setState({ loading: false, session: data.session });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setState({ loading: false, session });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/** Start the Google OAuth flow; lands back on the app root (within the Pages base path). */
export function signInWithGoogle(): void {
  void getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
  });
}
