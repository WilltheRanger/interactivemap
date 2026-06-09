import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Mail, Monitor, Moon, Sun, UserCircle2 } from 'lucide-react';
import { Button } from '../../components';
import { config } from '../../lib/config';
import { useTheme } from '../../data/useTheme';
import { useDisplayPrefs } from '../../data/useDisplayPrefs';
import { useMyLocker, useSchedule } from '../../data/usePersonal';
import { clearAll } from '../../lib/personalStore';
import type { ThemePreference } from '../../lib/theme';
import type { Contrast, TextSize } from '../../lib/displayPrefs';
import { Segmented, type SegmentedOption } from './Segmented';
import './AccountScreen.css';

const THEME_OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: 'light', label: 'Light', icon: <Sun size={16} aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden="true" /> },
  { value: 'system', label: 'System', icon: <Monitor size={16} aria-hidden="true" /> },
];
const TEXT_SIZE_OPTIONS: SegmentedOption<TextSize>[] = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'larger', label: 'Larger' },
];
const CONTRAST_OPTIONS: SegmentedOption<Contrast>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

const FEEDBACK_HREF = `mailto:${config.feedbackEmail}?subject=${encodeURIComponent(
  'DBHS Wayfinder — wrong info report',
)}&body=${encodeURIComponent(
  "What's wrong? (building / room / teacher / locker)\n\nWhere in the app did you see it?\n\n— Sent from DBHS Wayfinder",
)}`;

/**
 * Account screen. Google sign-in lands in Phase 09 (placeholder card for now); today it's the hub for
 * a student's on-device info (schedule + locker) and settings (theme, accessibility, clear-data).
 */
export function AccountScreen() {
  const { preference, resolved, setPreference } = useTheme();
  const { textSize, contrast, setTextSize, setContrast } = useDisplayPrefs();
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
          <Segmented
            ariaLabel="Theme"
            layoutId="theme-seg"
            value={preference}
            options={THEME_OPTIONS}
            onChange={setPreference}
          />
        </div>
        {preference === 'system' && (
          <p className="account__caption">Following your device — currently {resolved}.</p>
        )}
      </div>

      <h2 className="account__section-title">Accessibility</h2>
      <div className="account__card">
        <div className="account__setting">
          <div className="account__row">
            <span className="account__row-label">Text size</span>
            <Segmented
              ariaLabel="Text size"
              layoutId="text-seg"
              value={textSize}
              options={TEXT_SIZE_OPTIONS}
              onChange={setTextSize}
            />
          </div>
        </div>
        <div className="account__setting">
          <div className="account__row">
            <span className="account__row-label">Contrast</span>
            <Segmented
              ariaLabel="Contrast"
              layoutId="contrast-seg"
              value={contrast}
              options={CONTRAST_OPTIONS}
              onChange={setContrast}
            />
          </div>
        </div>
      </div>

      <h2 className="account__section-title">Help &amp; feedback</h2>
      <div className="account__card">
        <a className="account__link-row" href={FEEDBACK_HREF}>
          <span className="account__row-label">Report wrong info</span>
          <span className="account__row-value">
            <Mail size={18} aria-hidden="true" />
          </span>
        </a>
        <p className="account__hint">
          Found a wrong room, teacher, or locker? Email us so we can fix it.
        </p>
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
