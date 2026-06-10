import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { Button } from '../components';
import { signInWithGoogle, useSupabaseSession } from '../data/useSession';
import { isAllowedEmail } from '../lib/authPolicy';
import { config } from '../lib/config';
import { getSupabase } from '../lib/supabase';
import { duration, ease } from '../lib/motion';
import './RequireAuth.css';

/**
 * Phase 09 auth gate: the whole app requires a school Google account
 * (@stu.wvusd.org / @wvusd.org — plus the announcement admins, see authPolicy.ts).
 *
 * A signed-in but off-domain account is blocked here (the app never renders) and offered an
 * account switch; we keep the session until they act so the message can say which account was
 * rejected. Personal data (schedule/locker) still lives only on the device — signing in adds an
 * identity, not server-side student records.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const configured = config.isSupabaseConfigured;
  const { loading, session } = useSupabaseSession();

  if (configured && session && isAllowedEmail(session.user.email)) return <>{children}</>;

  return (
    <div className="auth-gate">
      <motion.div
        className="auth-gate__card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.base, ease: ease.out }}
      >
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          width={72}
          height={72}
          className="auth-gate__logo"
        />
        <h1 className="auth-gate__title">DBHS Wayfinder</h1>

        {!configured && (
          <p className="auth-gate__error" role="alert">
            The app isn&rsquo;t configured yet — Supabase environment variables are missing.
          </p>
        )}

        {configured && loading && (
          <p className="auth-gate__status" role="status">
            Checking sign-in…
          </p>
        )}

        {configured && !loading && !session && (
          <>
            <p className="auth-gate__sub">
              Sign in with your school Google account (<strong>@stu.wvusd.org</strong>) to use the
              Wayfinder.
            </p>
            <Button variant="primary" icon={<LogIn size={18} />} onClick={signInWithGoogle}>
              Sign in with Google
            </Button>
          </>
        )}

        {configured && !loading && session && !isAllowedEmail(session.user.email) && (
          <>
            <p className="auth-gate__error" role="alert">
              <strong>{session.user.email}</strong> isn&rsquo;t a school account. Sign in with your
              @stu.wvusd.org (or @wvusd.org) Google account.
            </p>
            <Button
              variant="primary"
              icon={<LogIn size={18} />}
              onClick={() => {
                void getSupabase()
                  .auth.signOut()
                  .then(() => signInWithGoogle());
              }}
            >
              Use a different account
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
