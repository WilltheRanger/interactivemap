import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Monitor, Moon, Sun, UserCircle2 } from 'lucide-react';
import { Button } from '../../components';
import { spring } from '../../lib/motion';
import { useTheme } from '../../data/useTheme';
import { useMyLocker, useSchedule } from '../../data/usePersonal';
import { clearAll } from '../../lib/personalStore';
import type { ThemePreference } from '../../lib/theme';
import './AccountScreen.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={16} aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden="true" /> },
  { value: 'system', label: 'System', icon: <Monitor size={16} aria-hidden="true" /> },
];

/**
 * Account screen. Google sign-in lands in Phase 09 (placeholder card for now); today it's the hub for
 * a student's on-device info (schedule + locker) and settings (theme, clear-data).
 */
export function AccountScreen() {
  const { preference, resolved, setPreference } = useTheme();
  const myLocker = useMyLocker();
  const schedule = useSchedule();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [justCleared, setJustCleared] = useState(false);

  const periodCount = Object.keys(schedule).length;
  const scheduleLabel =
    periodCount > 0 ? `${periodCount} ${periodCount === 1 ? 'class' : 'classes'} set` : 'None set';
  const lockerLabel = myLocker != null ? String(myLocker) : 'Not set';

  const handleClear = () => {
    clearAll();
    setConfirmingClear(false);
    setJustCleared(true);
  };

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

      <h2 className="account__section-title">Your info</h2>
      <div className="account__card">
        <Link to="/lockers" className="account__link-row">
          <span className="account__row-label">Locker</span>
          <span className="account__row-value">
            {lockerLabel}
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </Link>
        <Link to="/set-classes" className="account__link-row">
          <span className="account__row-label">Schedule</span>
          <span className="account__row-value">
            {scheduleLabel}
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </Link>
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

      <h2 className="account__section-title">Data</h2>
      <div className="account__card">
        {confirmingClear ? (
          <div role="group" aria-label="Confirm clearing your data">
            <p className="account__row-label">Clear your schedule and locker?</p>
            <p className="account__hint">
              This can&rsquo;t be undone. Your theme and future sign-in aren&rsquo;t affected.
            </p>
            <div className="account__actions">
              <Button variant="danger" onClick={handleClear}>
                Yes, clear it
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingClear(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="account__row">
              <div>
                <p className="account__row-label">Clear my data</p>
                <p className="account__hint">Removes your schedule and locker from this device.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setJustCleared(false);
                  setConfirmingClear(true);
                }}
              >
                Clear
              </Button>
            </div>
            {justCleared && (
              <p className="account__caption" role="status">
                Your schedule and locker were cleared.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
