import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Moon, Sun, UserCircle2 } from 'lucide-react';
import { spring } from '../../lib/motion';
import { useTheme } from '../../data/useTheme';
import type { ThemePreference } from '../../lib/theme';
import './AccountScreen.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={16} aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden="true" /> },
  { value: 'system', label: 'System', icon: <Monitor size={16} aria-hidden="true" /> },
];

/**
 * Account screen. Google sign-in lands in Phase 09 (placeholder card for now); today it hosts
 * on-device settings — starting with the Light / Dark / System theme control.
 */
export function AccountScreen() {
  const { preference, resolved, setPreference } = useTheme();

  return (
    <section className="screen account" aria-labelledby="account-title">
      <h1 id="account-title" className="screen__title">
        Account
      </h1>

      {/* Sign-in placeholder — Google sign-in (@stu.wvusd.org) arrives in Phase 09. */}
      <div className="account__card account__identity">
        <UserCircle2 className="account__avatar" size={44} aria-hidden="true" />
        <div className="account__identity-text">
          <p className="account__name">Guest</p>
          <p className="account__hint">School Google sign-in is coming soon.</p>
        </div>
      </div>

      <h2 className="account__section-title">Appearance</h2>
      <div className="account__card">
        <div className="account__row">
          <span className="account__row-label">Theme</span>
          <div className="seg" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => {
              const active = preference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`seg__option${active ? ' is-active' : ''}`}
                  onClick={() => setPreference(option.value)}
                >
                  {active && (
                    <motion.span
                      layoutId="theme-seg-indicator"
                      className="seg__indicator"
                      transition={spring.snappy}
                    />
                  )}
                  <span className="seg__content">
                    {option.icon}
                    <span className="seg__label">{option.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {preference === 'system' && (
          <p className="account__caption">Following your device — currently {resolved}.</p>
        )}
      </div>
    </section>
  );
}
